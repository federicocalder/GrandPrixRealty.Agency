#!/usr/bin/env python3
"""
SEO Analyzer for Grand Prix Realty Hugo Blog
Parses markdown files, calculates SEO scores, stores in Supabase

Usage:
    python analyzer.py                    # Full analysis
    python analyzer.py --file post.md     # Analyze single file
    python analyzer.py --dry-run          # Preview without DB writes
"""

import os
import re
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, asdict
import yaml
from bs4 import BeautifulSoup

# Try to import supabase, but allow dry-run without it
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("Warning: supabase package not installed. Use --dry-run mode.")

# Configuration - use environment variable or fallback to mounted path
CONTENT_BASE = Path(os.environ.get('CONTENT_BASE', '/content'))
CONTENT_PATH = Path(os.environ.get('CONTENT_PATH', '/content/blog'))  # Legacy

# Silo sections with their URL prefixes
SILO_SECTIONS = {
    'homebuyer': '/homebuyer/',
    'homeseller': '/homeseller/',
    'propertymanagement': '/propertymanagement/',
    'realtors': '/realtors/',
    'lasvegas': '/lasvegas/',
}

# Landing pages for internal link analysis
PRIORITY_PAGES = {
    "/": "Home",
    "/homebuyer/": "Home Buyers",
    "/homeseller/": "Home Sellers",
    "/property-management/": "Property Management",
    "/realtors/": "Realtors",
    "/buyer-search/": "Buyer Search",
    "/seller-portal/": "Seller Portal",
    "/contact/": "Contact",
}


@dataclass
class SEOScores:
    """SEO scores breakdown"""
    title: int = 0
    description: int = 0
    keyword: int = 0
    content: int = 0
    links: int = 0
    readability: int = 0
    overall: int = 0


@dataclass
class SEOIssue:
    """SEO issue tracking"""
    issue_type: str
    severity: str  # 'critical', 'warning', 'info'
    message: str
    suggestion: Optional[str] = None


@dataclass
class PostAnalysis:
    """Complete analysis result for a post"""
    filename: str  # Stable identifier (markdown filename without extension)
    slug: str
    url: str
    title: str
    seo_title: Optional[str]
    description: Optional[str]
    target_keyword: Optional[str]

    # Content metrics
    word_count: int
    h1_count: int
    h2_count: int
    h3_count: int
    paragraph_count: int
    image_count: int
    images_with_alt: int

    # Links
    internal_links_out: int
    external_links: int
    internal_link_targets: List[Dict[str, str]]

    # Scores
    scores: SEOScores
    issues: List[SEOIssue]

    # Meta
    categories: List[str]
    featured_listing_type: Optional[str]
    is_draft: bool
    has_wordpress_images: bool
    published_at: Optional[str]


def parse_front_matter(content: str) -> Tuple[Dict, str]:
    """Parse YAML front matter from markdown file."""
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            try:
                front_matter = yaml.safe_load(parts[1])
                body = parts[2]
                return front_matter or {}, body
            except yaml.YAMLError as e:
                print(f"  YAML parse error: {e}")
    return {}, content


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug (mimics Hugo's slugify behavior)."""
    if not text:
        return ""
    # Convert to lowercase
    slug = text.lower()
    # Replace spaces and underscores with hyphens
    slug = re.sub(r'[\s_]+', '-', slug)
    # Remove non-alphanumeric characters except hyphens
    slug = re.sub(r'[^a-z0-9\-]', '', slug)
    # Remove consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug


def extract_text_from_html(html_content: str) -> str:
    """Extract plain text from HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    for script in soup(["script", "style"]):
        script.decompose()
    return soup.get_text(separator=' ', strip=True)


def count_words(text: str) -> int:
    """Count words in text."""
    words = re.findall(r'\b\w+\b', text)
    return len(words)


def analyze_content_structure(html_content: str) -> Dict[str, int]:
    """Analyze HTML structure (headings, paragraphs, etc.)"""
    soup = BeautifulSoup(html_content, 'html.parser')

    return {
        'h1_count': len(soup.find_all('h1')),
        'h2_count': len(soup.find_all('h2')),
        'h3_count': len(soup.find_all('h3')),
        'paragraph_count': len(soup.find_all('p')),
    }


def analyze_images(html_content: str) -> Tuple[int, int, bool]:
    """Analyze images in content. Returns (total, with_alt, has_wordpress)"""
    soup = BeautifulSoup(html_content, 'html.parser')
    images = soup.find_all('img')

    total = len(images)
    with_alt = 0
    has_wordpress = False

    for img in images:
        if img.get('alt'):
            with_alt += 1
        src = img.get('src', '')
        if 'wp-content/uploads' in src or 'wordpress' in src.lower():
            has_wordpress = True

    return total, with_alt, has_wordpress


def analyze_links(html_content: str, current_slug: str) -> Dict[str, Any]:
    """Analyze links in content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    anchors = soup.find_all('a', href=True)

    internal_links = []
    external_count = 0

    for a in anchors:
        href = a['href']
        anchor_text = a.get_text(strip=True)

        # Skip empty or anchor-only links
        if not href or href.startswith('#'):
            continue

        # Determine if internal or external
        is_internal = (
            href.startswith('/') or
            'grandprixrealty.agency' in href
        )

        if is_internal:
            # Normalize the URL
            if 'grandprixrealty.agency' in href:
                # Extract path from full URL
                path = '/' + href.split('grandprixrealty.agency')[-1].lstrip('/')
            else:
                path = href

            # Extract slug from path
            target_slug = path.rstrip('/').split('/')[-1] if path != '/' else 'home'

            internal_links.append({
                'target_url': path,
                'target_slug': target_slug,
                'anchor_text': anchor_text[:100] if anchor_text else ''
            })
        else:
            external_count += 1

    return {
        'internal_links': internal_links,
        'internal_count': len(internal_links),
        'external_count': external_count
    }


def calculate_title_score(title: str, target_keyword: Optional[str]) -> Tuple[int, List[SEOIssue]]:
    """Calculate title SEO score (0-100)"""
    score = 0
    issues = []

    if not title:
        issues.append(SEOIssue(
            issue_type='missing_title',
            severity='critical',
            message='Post has no title',
            suggestion='Add a descriptive title to your post'
        ))
        return 0, issues

    title_len = len(title)

    # Length scoring
    if 30 <= title_len <= 60:
        score += 40  # Optimal length
    elif 20 <= title_len <= 70:
        score += 20  # Acceptable
        if title_len < 30:
            issues.append(SEOIssue(
                issue_type='title_too_short',
                severity='warning',
                message=f'Title is short ({title_len} chars). Aim for 30-60 characters.',
                suggestion='Expand your title to include more descriptive keywords'
            ))
        else:
            issues.append(SEOIssue(
                issue_type='title_too_long',
                severity='warning',
                message=f'Title is long ({title_len} chars). Google may truncate it.',
                suggestion='Shorten your title to under 60 characters'
            ))
    else:
        if title_len < 20:
            issues.append(SEOIssue(
                issue_type='title_too_short',
                severity='critical',
                message=f'Title is very short ({title_len} chars)',
                suggestion='Expand your title significantly'
            ))
        else:
            issues.append(SEOIssue(
                issue_type='title_too_long',
                severity='warning',
                message=f'Title is very long ({title_len} chars)',
                suggestion='Significantly shorten your title'
            ))

    # Keyword in title
    if target_keyword:
        if target_keyword.lower() in title.lower():
            score += 40
        else:
            issues.append(SEOIssue(
                issue_type='keyword_not_in_title',
                severity='warning',
                message=f'Target keyword "{target_keyword}" not found in title',
                suggestion=f'Include "{target_keyword}" in your title'
            ))

    # Proper capitalization
    if title[0].isupper():
        score += 10

    # Not truncated
    if not title.endswith('...'):
        score += 10
    else:
        issues.append(SEOIssue(
            issue_type='title_truncated',
            severity='info',
            message='Title appears to be truncated',
            suggestion='Provide the complete title'
        ))

    return min(score, 100), issues


def calculate_description_score(description: Optional[str], target_keyword: Optional[str]) -> Tuple[int, List[SEOIssue]]:
    """Calculate meta description SEO score (0-100)"""
    score = 0
    issues = []

    if not description:
        issues.append(SEOIssue(
            issue_type='missing_description',
            severity='critical',
            message='No meta description defined',
            suggestion='Add a compelling meta description (120-155 characters)'
        ))
        return 0, issues

    desc_len = len(description)

    # Has description
    score += 20

    # Length scoring
    if 120 <= desc_len <= 155:
        score += 50  # Optimal
    elif 80 <= desc_len <= 160:
        score += 30  # Acceptable
        if desc_len < 120:
            issues.append(SEOIssue(
                issue_type='short_description',
                severity='info',
                message=f'Description is short ({desc_len} chars). Aim for 120-155.',
                suggestion='Expand your description to better summarize the content'
            ))
    else:
        if desc_len < 80:
            issues.append(SEOIssue(
                issue_type='short_description',
                severity='warning',
                message=f'Description is very short ({desc_len} chars)',
                suggestion='Write a more detailed description'
            ))
        else:
            issues.append(SEOIssue(
                issue_type='long_description',
                severity='warning',
                message=f'Description is too long ({desc_len} chars). May be truncated.',
                suggestion='Shorten to under 155 characters'
            ))

    # Keyword in description
    if target_keyword and description:
        if target_keyword.lower() in description.lower():
            score += 30
        else:
            issues.append(SEOIssue(
                issue_type='keyword_not_in_description',
                severity='info',
                message=f'Target keyword "{target_keyword}" not in description',
                suggestion=f'Include "{target_keyword}" naturally in your description'
            ))

    return min(score, 100), issues


def calculate_content_score(word_count: int, structure: Dict[str, int], images: Tuple[int, int, bool]) -> Tuple[int, List[SEOIssue]]:
    """Calculate content quality score (0-100)"""
    score = 0
    issues = []
    image_count, images_with_alt, has_wordpress = images

    # Word count scoring
    if word_count >= 2000:
        score += 30  # Long-form
    elif word_count >= 1200:
        score += 25  # Good
    elif word_count >= 800:
        score += 20  # Acceptable
    elif word_count >= 500:
        score += 10  # Minimum
        issues.append(SEOIssue(
            issue_type='short_content',
            severity='warning',
            message=f'Content is relatively short ({word_count} words)',
            suggestion='Consider expanding to at least 800-1000 words for better SEO'
        ))
    else:
        issues.append(SEOIssue(
            issue_type='short_content',
            severity='critical',
            message=f'Content is very short ({word_count} words)',
            suggestion='Expand significantly. Aim for at least 800 words.'
        ))

    # Structure scoring (H2s)
    h2_count = structure.get('h2_count', 0)
    if h2_count >= 4:
        score += 20
    elif h2_count >= 2:
        score += 15
    elif h2_count >= 1:
        score += 10
    else:
        issues.append(SEOIssue(
            issue_type='missing_h2',
            severity='warning',
            message='No H2 headings found',
            suggestion='Add H2 subheadings to organize your content'
        ))

    # Images scoring
    if image_count > 0:
        score += 15  # Has images

        # Alt text
        if image_count > 0:
            alt_ratio = images_with_alt / image_count
            score += int(alt_ratio * 15)

            if alt_ratio < 1:
                missing_alt = image_count - images_with_alt
                issues.append(SEOIssue(
                    issue_type='missing_alt_text',
                    severity='warning',
                    message=f'{missing_alt} image(s) missing alt text',
                    suggestion='Add descriptive alt text to all images'
                ))
    else:
        score += 10  # No images penalty is light
        issues.append(SEOIssue(
            issue_type='no_images',
            severity='info',
            message='No images in content',
            suggestion='Consider adding relevant images to improve engagement'
        ))

    # WordPress images check
    if has_wordpress:
        issues.append(SEOIssue(
            issue_type='wordpress_images',
            severity='warning',
            message='Still using WordPress image URLs',
            suggestion='Migrate images to local hosting or CDN'
        ))

    # Paragraph count
    p_count = structure.get('paragraph_count', 0)
    if p_count >= 5:
        score += 10
    elif p_count >= 3:
        score += 5

    return min(score, 100), issues


def calculate_links_score(
    internal_count: int,
    external_count: int,
    internal_links: List[Dict],
    inbound_count: int = 0
) -> Tuple[int, List[SEOIssue]]:
    """Calculate internal/external links score (0-100)"""
    score = 0
    issues = []

    # Outbound internal links
    if internal_count >= 5:
        score += 35
    elif internal_count >= 3:
        score += 25
    elif internal_count >= 1:
        score += 15
        issues.append(SEOIssue(
            issue_type='few_internal_links',
            severity='warning',
            message=f'Only {internal_count} internal link(s)',
            suggestion='Add more internal links to related content (aim for 3-5)'
        ))
    else:
        issues.append(SEOIssue(
            issue_type='no_internal_links',
            severity='critical',
            message='No internal links found',
            suggestion='Add internal links to your main pages and related blog posts'
        ))

    # Check for priority page links
    priority_linked = set()
    for link in internal_links:
        url = link.get('target_url', '')
        for priority_url in PRIORITY_PAGES:
            if priority_url in url or url == priority_url:
                priority_linked.add(priority_url)

    if len(priority_linked) >= 2:
        score += 15
    elif len(priority_linked) >= 1:
        score += 10

    # Inbound links (if we have data)
    if inbound_count >= 5:
        score += 35
    elif inbound_count >= 2:
        score += 25
    elif inbound_count >= 1:
        score += 15
    else:
        issues.append(SEOIssue(
            issue_type='orphan_page',
            severity='warning',
            message='No inbound internal links (orphan page)',
            suggestion='Link to this page from other relevant posts'
        ))

    # External links (light bonus)
    if external_count >= 1:
        score += 10

    return min(score, 100), issues


def calculate_keyword_score(
    target_keyword: Optional[str],
    title: str,
    description: Optional[str],
    content_text: str
) -> Tuple[int, List[SEOIssue]]:
    """Calculate keyword optimization score (0-100)"""
    score = 0
    issues = []

    if not target_keyword:
        issues.append(SEOIssue(
            issue_type='missing_target_keyword',
            severity='warning',
            message='No target keyword defined',
            suggestion='Define a target keyword in the front matter'
        ))
        return 20, issues  # Base score for having content

    kw_lower = target_keyword.lower()
    score += 20  # Has keyword defined

    # Keyword in title
    if kw_lower in title.lower():
        score += 25

    # Keyword in description
    if description and kw_lower in description.lower():
        score += 20

    # Keyword density in content (rough check)
    content_lower = content_text.lower()
    word_count = len(content_text.split())

    if word_count > 0:
        # Count keyword occurrences
        kw_count = content_lower.count(kw_lower)
        density = (kw_count / word_count) * 100

        if 0.5 <= density <= 2.5:
            score += 25  # Good density
        elif 0.1 <= density <= 3.5:
            score += 15  # Acceptable
        elif density > 3.5:
            issues.append(SEOIssue(
                issue_type='keyword_stuffing',
                severity='warning',
                message=f'Keyword density too high ({density:.1f}%)',
                suggestion='Reduce keyword usage to avoid over-optimization'
            ))
        else:
            issues.append(SEOIssue(
                issue_type='low_keyword_density',
                severity='info',
                message=f'Keyword density very low ({density:.2f}%)',
                suggestion='Include your target keyword more naturally throughout the content'
            ))

    # Keyword in first 100 words
    first_100_words = ' '.join(content_text.split()[:100]).lower()
    if kw_lower in first_100_words:
        score += 10

    return min(score, 100), issues


def calculate_readability_score(content_text: str) -> int:
    """Calculate readability score (simplified)"""
    score = 50  # Base score

    words = content_text.split()
    word_count = len(words)

    if word_count < 100:
        return score

    sentences = re.split(r'[.!?]+', content_text)
    sentence_count = len([s for s in sentences if s.strip()])

    if sentence_count > 0:
        avg_sentence_length = word_count / sentence_count

        # Ideal is 15-20 words per sentence
        if 12 <= avg_sentence_length <= 22:
            score += 30
        elif 10 <= avg_sentence_length <= 25:
            score += 20
        else:
            score += 10

    # Paragraph variety (check for short paragraphs)
    paragraphs = content_text.split('\n\n')
    if len(paragraphs) >= 5:
        score += 20

    return min(score, 100)


def analyze_post(filepath: Path, section: str = None) -> Optional[PostAnalysis]:
    """Complete SEO analysis of a single blog post.

    Args:
        filepath: Path to the markdown file
        section: The silo section (e.g., 'homebuyer', 'propertymanagement')
                 If None, defaults to 'blog' for legacy URLs
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  Error reading file: {e}")
        return None

    front_matter, body = parse_front_matter(content)

    if not front_matter:
        print(f"  No front matter found")
        return None

    # Extract basic info
    title = front_matter.get('title', '')
    # Use title-based slug to match Hugo's URL generation behavior
    slug = slugify(title) if title else filepath.stem
    description = front_matter.get('description')
    target_keyword = front_matter.get('target_keyword')
    categories = front_matter.get('categories', [])
    featured_listing_type = front_matter.get('featured_listing_type')
    is_draft = front_matter.get('draft', False)

    # Get published date
    pub_date = front_matter.get('date')
    published_at = None
    if pub_date:
        if isinstance(pub_date, datetime):
            published_at = pub_date.isoformat()
        elif isinstance(pub_date, str):
            published_at = pub_date

    # Analyze content
    content_text = extract_text_from_html(body)
    word_count = count_words(content_text)
    structure = analyze_content_structure(body)
    image_count, images_with_alt, has_wordpress = analyze_images(body)
    links_analysis = analyze_links(body, slug)

    # Calculate scores
    all_issues = []

    title_score, title_issues = calculate_title_score(title, target_keyword)
    all_issues.extend(title_issues)

    desc_score, desc_issues = calculate_description_score(description, target_keyword)
    all_issues.extend(desc_issues)

    content_score, content_issues = calculate_content_score(
        word_count, structure, (image_count, images_with_alt, has_wordpress)
    )
    all_issues.extend(content_issues)

    links_score, links_issues = calculate_links_score(
        links_analysis['internal_count'],
        links_analysis['external_count'],
        links_analysis['internal_links'],
        0  # inbound_count - will be calculated later
    )
    all_issues.extend(links_issues)

    keyword_score, keyword_issues = calculate_keyword_score(
        target_keyword, title, description, content_text
    )
    all_issues.extend(keyword_issues)

    readability_score = calculate_readability_score(content_text)

    # Calculate overall score (weighted)
    weights = {
        'title': 0.18,
        'description': 0.12,
        'keyword': 0.15,
        'content': 0.25,
        'links': 0.20,
        'readability': 0.10
    }

    overall = int(
        title_score * weights['title'] +
        desc_score * weights['description'] +
        keyword_score * weights['keyword'] +
        content_score * weights['content'] +
        links_score * weights['links'] +
        readability_score * weights['readability']
    )

    scores = SEOScores(
        title=title_score,
        description=desc_score,
        keyword=keyword_score,
        content=content_score,
        links=links_score,
        readability=readability_score,
        overall=overall
    )

    # Determine URL based on section
    if section and section in SILO_SECTIONS:
        url = f"{SILO_SECTIONS[section]}{slug}/"
    else:
        url = f"/blog/{slug}/"  # Legacy fallback

    return PostAnalysis(
        filename=filepath.stem,  # Stable identifier
        slug=slug,
        url=url,
        title=title,
        seo_title=front_matter.get('seo_title'),
        description=description,
        target_keyword=target_keyword,
        word_count=word_count,
        h1_count=structure['h1_count'],
        h2_count=structure['h2_count'],
        h3_count=structure['h3_count'],
        paragraph_count=structure['paragraph_count'],
        image_count=image_count,
        images_with_alt=images_with_alt,
        internal_links_out=links_analysis['internal_count'],
        external_links=links_analysis['external_count'],
        internal_link_targets=links_analysis['internal_links'],
        scores=scores,
        issues=all_issues,
        categories=categories,
        featured_listing_type=featured_listing_type,
        is_draft=is_draft,
        has_wordpress_images=has_wordpress,
        published_at=published_at
    )


def save_to_supabase(
    analysis: PostAnalysis,
    supabase: 'Client',
    dry_run: bool = False
) -> bool:
    """Save analysis results to Supabase."""
    if dry_run:
        return True

    try:
        # Prepare post data
        post_data = {
            'filename': analysis.filename,  # Stable identifier
            'slug': analysis.slug,
            'url': analysis.url,
            'title': analysis.title,
            'seo_title': analysis.seo_title,
            'description': analysis.description,
            'target_keyword': analysis.target_keyword,
            'word_count': analysis.word_count,
            'h1_count': analysis.h1_count,
            'h2_count': analysis.h2_count,
            'h3_count': analysis.h3_count,
            'paragraph_count': analysis.paragraph_count,
            'image_count': analysis.image_count,
            'images_with_alt': analysis.images_with_alt,
            'internal_links_out': analysis.internal_links_out,
            'external_links': analysis.external_links,
            'title_score': analysis.scores.title,
            'description_score': analysis.scores.description,
            'keyword_score': analysis.scores.keyword,
            'content_score': analysis.scores.content,
            'links_score': analysis.scores.links,
            'readability_score': analysis.scores.readability,
            'overall_score': analysis.scores.overall,
            'categories': analysis.categories,
            'featured_listing_type': analysis.featured_listing_type,
            'is_draft': analysis.is_draft,
            'has_wordpress_images': analysis.has_wordpress_images,
            'published_at': analysis.published_at,
            'last_analyzed_at': datetime.utcnow().isoformat()
        }

        # Use schema('seo') to access tables in the seo schema
        seo = supabase.schema('seo')

        # Upsert post using filename as stable identifier
        # This ensures title/slug changes UPDATE existing rows instead of creating duplicates
        seo.table('posts').upsert(
            post_data,
            on_conflict='filename'
        ).execute()

        # Delete old links for this post
        seo.table('internal_links').delete().eq(
            'source_slug', analysis.slug
        ).execute()

        # Insert new links
        for link in analysis.internal_link_targets:
            seo.table('internal_links').insert({
                'source_slug': analysis.slug,
                'target_url': link['target_url'],
                'target_slug': link.get('target_slug'),
                'anchor_text': link.get('anchor_text', '')[:100]
            }).execute()

        # Delete old issues for this post
        seo.table('issues').delete().eq(
            'post_slug', analysis.slug
        ).execute()

        # Insert new issues
        for issue in analysis.issues:
            seo.table('issues').insert({
                'post_slug': analysis.slug,
                'issue_type': issue.issue_type,
                'severity': issue.severity,
                'message': issue.message,
                'suggestion': issue.suggestion
            }).execute()

        return True

    except Exception as e:
        print(f"  Error saving to Supabase: {e}")
        return False


def print_analysis_summary(analysis: PostAnalysis):
    """Print a human-readable summary of the analysis."""
    print(f"\n  Title: {analysis.title[:60]}{'...' if len(analysis.title) > 60 else ''}")
    print(f"  URL: {analysis.url}")
    print(f"  Categories: {', '.join(analysis.categories)}")
    print(f"  Draft: {analysis.is_draft}")
    print()
    print(f"  Content Metrics:")
    print(f"    Words: {analysis.word_count}")
    print(f"    H2s: {analysis.h2_count}, H3s: {analysis.h3_count}")
    print(f"    Images: {analysis.image_count} ({analysis.images_with_alt} with alt)")
    print(f"    Internal links out: {analysis.internal_links_out}")
    print()
    print(f"  SEO Scores:")
    print(f"    Title:       {analysis.scores.title:3d}/100")
    print(f"    Description: {analysis.scores.description:3d}/100")
    print(f"    Keyword:     {analysis.scores.keyword:3d}/100")
    print(f"    Content:     {analysis.scores.content:3d}/100")
    print(f"    Links:       {analysis.scores.links:3d}/100")
    print(f"    Readability: {analysis.scores.readability:3d}/100")
    print(f"    ─────────────────────")
    print(f"    OVERALL:     {analysis.scores.overall:3d}/100")
    print()

    if analysis.issues:
        print(f"  Issues ({len(analysis.issues)}):")
        for issue in sorted(analysis.issues, key=lambda x: {'critical': 0, 'warning': 1, 'info': 2}[x.severity]):
            severity_icon = {'critical': '🔴', 'warning': '🟡', 'info': '🔵'}[issue.severity]
            print(f"    {severity_icon} [{issue.severity.upper()}] {issue.message}")
    else:
        print("  ✅ No issues found!")


def main():
    parser = argparse.ArgumentParser(description='SEO Analyzer for Grand Prix Realty Blog')
    parser.add_argument('--dry-run', action='store_true', help='Analyze without saving to database')
    parser.add_argument('--file', type=str, help='Analyze a specific file by name')
    parser.add_argument('--single', type=str, help='Analyze a single file by full path')
    parser.add_argument('--section', type=str, help='Analyze only a specific section')
    parser.add_argument('--limit', type=int, help='Limit number of files to analyze')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    args = parser.parse_args()

    # Initialize Supabase client
    supabase = None
    if not args.dry_run:
        if not SUPABASE_AVAILABLE:
            print("Error: supabase package not installed. Use --dry-run or install: pip install supabase")
            return

        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
            print("Use --dry-run to analyze without database")
            return

        supabase = create_client(supabase_url, supabase_key)

    # Collect files from all silo directories
    files_with_sections = []  # List of (filepath, section) tuples

    if args.single:
        # Single file mode with full path
        single_path = Path(args.single)
        if not single_path.exists():
            print(f"Error: File not found: {args.single}")
            return

        # Determine section from path
        section = None
        for sec_name in SILO_SECTIONS:
            if f'/{sec_name}/' in str(single_path):
                section = sec_name
                break

        files_with_sections.append((single_path, section))
        print(f"Single file mode: {single_path.name}")

    elif args.file:
        # Single file mode - try to find it in any section
        for section in SILO_SECTIONS:
            section_path = CONTENT_BASE / section / args.file
            if section_path.exists():
                files_with_sections.append((section_path, section))
                break
        # Also check legacy path
        legacy_path = CONTENT_PATH / args.file
        if legacy_path.exists() and not files_with_sections:
            files_with_sections.append((legacy_path, None))
    else:
        # Scan all silo directories
        sections_to_scan = [args.section] if args.section else list(SILO_SECTIONS.keys())

        for section in sections_to_scan:
            section_path = CONTENT_BASE / section
            if section_path.exists():
                section_files = sorted([f for f in section_path.glob("*.md") if f.name != "_index.md"])
                for f in section_files:
                    files_with_sections.append((f, section))
                print(f"Found {len(section_files)} posts in /{section}/")

        # Also check legacy blog directory if no section filter
        if not args.section and CONTENT_PATH.exists():
            legacy_files = sorted([f for f in CONTENT_PATH.glob("*.md") if f.name != "_index.md"])
            for f in legacy_files:
                files_with_sections.append((f, None))
            if legacy_files:
                print(f"Found {len(legacy_files)} posts in legacy /blog/")

    if not files_with_sections:
        print("Error: No blog posts found in any silo directory")
        return

    if args.limit:
        files_with_sections = files_with_sections[:args.limit]

    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Analyzing {len(files_with_sections)} blog posts...\n")

    # Track statistics
    total_analyzed = 0
    total_issues = 0
    score_sum = 0
    score_distribution = {'excellent': 0, 'good': 0, 'needs_work': 0, 'poor': 0}
    severity_counts = {'critical': 0, 'warning': 0, 'info': 0}

    for filepath, section in files_with_sections:
        section_label = f"/{section}/" if section else "/blog/"
        print(f"Analyzing: {section_label}{filepath.name}")

        analysis = analyze_post(filepath, section)

        if not analysis:
            print("  ⚠️  Skipped (could not analyze)\n")
            continue

        total_analyzed += 1
        score_sum += analysis.scores.overall
        total_issues += len(analysis.issues)

        # Track score distribution
        if analysis.scores.overall >= 80:
            score_distribution['excellent'] += 1
        elif analysis.scores.overall >= 60:
            score_distribution['good'] += 1
        elif analysis.scores.overall >= 40:
            score_distribution['needs_work'] += 1
        else:
            score_distribution['poor'] += 1

        # Track severity
        for issue in analysis.issues:
            severity_counts[issue.severity] += 1

        if args.verbose:
            print_analysis_summary(analysis)
        else:
            score_emoji = '🟢' if analysis.scores.overall >= 80 else '🟡' if analysis.scores.overall >= 60 else '🟠' if analysis.scores.overall >= 40 else '🔴'
            print(f"  {score_emoji} Score: {analysis.scores.overall}/100 | Issues: {len(analysis.issues)}")

        # Save to database
        if not args.dry_run and supabase:
            if save_to_supabase(analysis, supabase, args.dry_run):
                print("  ✓ Saved to database")
            else:
                print("  ✗ Failed to save")

        print()

    # Print summary
    print("=" * 60)
    print(f"{'[DRY RUN] ' if args.dry_run else ''}Analysis Complete")
    print("=" * 60)
    print(f"\nPosts Analyzed: {total_analyzed}")
    print(f"Average Score: {score_sum / total_analyzed:.1f}/100" if total_analyzed > 0 else "N/A")
    print(f"\nScore Distribution:")
    print(f"  🟢 Excellent (80+): {score_distribution['excellent']}")
    print(f"  🟡 Good (60-79):    {score_distribution['good']}")
    print(f"  🟠 Needs Work (40-59): {score_distribution['needs_work']}")
    print(f"  🔴 Poor (<40):      {score_distribution['poor']}")
    print(f"\nTotal Issues: {total_issues}")
    print(f"  🔴 Critical: {severity_counts['critical']}")
    print(f"  🟡 Warning:  {severity_counts['warning']}")
    print(f"  🔵 Info:     {severity_counts['info']}")

    if args.dry_run:
        print("\n[DRY RUN] No data was saved. Remove --dry-run to save to Supabase.")


if __name__ == "__main__":
    main()

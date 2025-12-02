#!/usr/bin/env python3
"""
Blog Publication Script for Grand Prix Realty
Processes all 244 WordPress-migrated blog posts:
1. Sets draft: false
2. Consolidates categories to 4 main categories
3. Auto-generates descriptions from first paragraph
4. Extracts target keywords from title
5. Adds featured_listing_type based on category
"""

import os
import re
import yaml
from pathlib import Path
from bs4 import BeautifulSoup
from typing import Optional, List, Dict
import argparse

# Configuration
CONTENT_PATH = Path(__file__).parent.parent / "grandprixrealty.agency" / "content" / "blog"

# Category mapping from old WordPress categories to new simplified categories
CATEGORY_MAPPING = {
    # Buyers
    "buyer": "buyers",
    "buyers": "buyers",
    "first-time": "buyers",
    "first time": "buyers",
    "homebuyer": "buyers",
    "home buyer": "buyers",
    "buying": "buyers",
    "purchase": "buyers",
    "mortgage": "buyers",
    "downpayment": "buyers",
    "down payment": "buyers",
    "downpayment assistance": "buyers",

    # Sellers
    "seller": "sellers",
    "sellers": "sellers",
    "selling": "sellers",
    "home seller": "sellers",
    "homeseller": "sellers",
    "listing": "sellers",
    "listings": "sellers",
    "home value": "sellers",
    "appraisal": "sellers",
    "staging": "sellers",

    # Landlords (Investors)
    "landlord": "landlords",
    "landlords": "landlords",
    "investor": "landlords",
    "investors": "landlords",
    "investment": "landlords",
    "property management": "landlords",
    "rental": "landlords",
    "tenant": "landlords",
    "lease": "landlords",
    "renting": "landlords",

    # Realtors (Careers)
    "realtor": "realtors",
    "realtors": "realtors",
    "agent": "realtors",
    "agents": "realtors",
    "new agent": "realtors",
    "career": "realtors",
    "careers": "realtors",
    "real estate career": "realtors",
    "brokerage": "realtors",
}

# Keywords to detect category from content/title if categories are ambiguous
CATEGORY_KEYWORDS = {
    "buyers": [
        "buy", "buying", "purchase", "mortgage", "loan", "down payment",
        "first-time", "homebuyer", "pre-approval", "closing costs",
        "home search", "house hunting", "offer", "escrow"
    ],
    "sellers": [
        "sell", "selling", "list", "listing", "home value", "appraisal",
        "staging", "curb appeal", "open house", "price", "commission",
        "market analysis", "cma", "fsbo"
    ],
    "landlords": [
        "landlord", "tenant", "rental", "lease", "property management",
        "investor", "investment", "roi", "cash flow", "eviction",
        "security deposit", "rental income", "vacancy"
    ],
    "realtors": [
        "realtor", "agent", "broker", "license", "commission", "career",
        "lead generation", "marketing", "crm", "nar", "mls access"
    ]
}

# Landing pages for internal linking
LANDING_PAGES = {
    "buyers": {"url": "/homebuyer/", "text": "Start Your Home Search", "tagline": "Deals Done Surgical Clean"},
    "sellers": {"url": "/homeseller/", "text": "Get Your Home's Value", "tagline": "Cash Bigger Checks, Build Bigger Things"},
    "landlords": {"url": "/property-management/", "text": "Property Management Services", "tagline": "Like Aspirin for Landlords"},
    "realtors": {"url": "/realtors/", "text": "Join Our Team", "tagline": "Pure Nitro for Agents"},
}


def extract_text_from_html(html_content: str) -> str:
    """Extract plain text from HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.decompose()
    return soup.get_text(separator=' ', strip=True)


def get_first_paragraph(content: str, max_length: int = 155) -> str:
    """Extract and clean the first meaningful paragraph for description."""
    soup = BeautifulSoup(content, 'html.parser')

    # Try to find the first <p> tag with substantial content
    for p in soup.find_all('p'):
        text = p.get_text(strip=True)
        # Skip empty or very short paragraphs
        if len(text) > 50:
            # Clean up the text
            text = re.sub(r'\s+', ' ', text)
            # Truncate to max_length, ending at a word boundary
            if len(text) > max_length:
                text = text[:max_length].rsplit(' ', 1)[0] + '...'
            return text

    # Fallback: get first 155 chars of any text
    text = extract_text_from_html(content)
    if len(text) > max_length:
        text = text[:max_length].rsplit(' ', 1)[0] + '...'
    return text


def extract_keywords_from_title(title: str) -> List[str]:
    """Extract potential keywords from the title."""
    # Common stop words to exclude
    stop_words = {
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
        'your', 'our', 'their', 'its', 'his', 'her', 'my', 'this', 'that',
        'these', 'those', 'what', 'which', 'who', 'whom', 'how', 'when',
        'where', 'why', 'all', 'each', 'every', 'both', 'few', 'more',
        'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
        'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here'
    }

    # Extract words from title
    words = re.findall(r'\b[a-zA-Z]{3,}\b', title.lower())

    # Filter out stop words and duplicates
    keywords = []
    seen = set()
    for word in words:
        if word not in stop_words and word not in seen:
            keywords.append(word)
            seen.add(word)

    return keywords[:5]  # Return top 5 keywords


def get_target_keyword(title: str, keywords: List[str]) -> str:
    """Determine the primary target keyword."""
    title_lower = title.lower()

    # Priority keywords for real estate
    priority_terms = [
        'las vegas', 'nevada', 'property management', 'real estate',
        'home buying', 'home selling', 'landlord', 'tenant', 'rental',
        'investment', 'mortgage', 'first-time', 'homebuyer'
    ]

    # Check for priority terms in title
    for term in priority_terms:
        if term in title_lower:
            return term

    # Check for two-word combinations
    words = title_lower.split()
    for i in range(len(words) - 1):
        bigram = f"{words[i]} {words[i+1]}"
        if any(kw in bigram for kw in ['home', 'real', 'property', 'rental']):
            return bigram

    # Fall back to first keyword
    return keywords[0] if keywords else "las vegas real estate"


def map_categories(old_categories: List[str], title: str, content: str) -> List[str]:
    """Map old WordPress categories to new simplified categories."""
    new_categories = set()

    # First, try direct mapping from old categories
    for cat in old_categories:
        cat_lower = cat.lower().strip()
        if cat_lower in CATEGORY_MAPPING:
            new_categories.add(CATEGORY_MAPPING[cat_lower])

    # If no mapping found, analyze title and content
    if not new_categories:
        title_lower = title.lower()
        content_text = extract_text_from_html(content).lower()
        combined_text = f"{title_lower} {content_text[:1000]}"

        scores = {cat: 0 for cat in ["buyers", "sellers", "landlords", "realtors"]}

        for category, keywords in CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword in combined_text:
                    scores[category] += 1

        # Get category with highest score
        best_category = max(scores, key=scores.get)
        if scores[best_category] > 0:
            new_categories.add(best_category)
        else:
            # Default to buyers if nothing matches
            new_categories.add("buyers")

    return sorted(list(new_categories))


def parse_front_matter(content: str) -> tuple:
    """Parse YAML front matter from markdown file."""
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            try:
                front_matter = yaml.safe_load(parts[1])
                body = parts[2]
                return front_matter or {}, body
            except yaml.YAMLError:
                pass
    return {}, content


def serialize_front_matter(front_matter: dict, body: str) -> str:
    """Serialize front matter back to markdown."""
    # Custom YAML dump to handle special characters
    yaml_str = yaml.dump(
        front_matter,
        default_flow_style=False,
        allow_unicode=True,
        sort_keys=False,
        width=1000  # Prevent line wrapping
    )
    return f"---\n{yaml_str}---\n{body}"


def process_blog_post(filepath: Path, dry_run: bool = False) -> Dict:
    """Process a single blog post file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    front_matter, body = parse_front_matter(content)

    if not front_matter:
        return {"file": filepath.name, "status": "skipped", "reason": "no front matter"}

    # Track changes
    changes = []

    # 1. Set draft to false
    if front_matter.get('draft', True):
        front_matter['draft'] = False
        changes.append("set draft=false")

    # 2. Map categories
    old_categories = front_matter.get('categories', [])
    if isinstance(old_categories, str):
        old_categories = [old_categories]

    new_categories = map_categories(old_categories, front_matter.get('title', ''), body)
    front_matter['categories'] = new_categories
    changes.append(f"categories: {old_categories} -> {new_categories}")

    # 3. Generate description if missing
    if not front_matter.get('description'):
        description = get_first_paragraph(body)
        front_matter['description'] = description
        changes.append(f"added description ({len(description)} chars)")

    # 4. Extract keywords
    title = front_matter.get('title', '')
    keywords = extract_keywords_from_title(title)
    if not front_matter.get('keywords'):
        front_matter['keywords'] = keywords
        changes.append(f"added keywords: {keywords}")

    # 5. Set target keyword
    if not front_matter.get('target_keyword'):
        target_kw = get_target_keyword(title, keywords)
        front_matter['target_keyword'] = target_kw
        changes.append(f"target_keyword: {target_kw}")

    # 6. Set featured_listing_type based on primary category
    primary_category = new_categories[0] if new_categories else "buyers"
    front_matter['featured_listing_type'] = primary_category
    changes.append(f"featured_listing_type: {primary_category}")

    # 7. Update author
    front_matter['author'] = "Grand Prix Realty"

    # Write updated file
    if not dry_run:
        new_content = serialize_front_matter(front_matter, body)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

    return {
        "file": filepath.name,
        "status": "processed",
        "changes": changes,
        "categories": new_categories,
        "title": title[:50] + "..." if len(title) > 50 else title
    }


def main():
    parser = argparse.ArgumentParser(description='Publish and process blog posts')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without writing')
    parser.add_argument('--limit', type=int, help='Limit number of files to process')
    parser.add_argument('--file', type=str, help='Process a specific file')
    args = parser.parse_args()

    if not CONTENT_PATH.exists():
        print(f"Error: Content path not found: {CONTENT_PATH}")
        return

    # Get all markdown files
    if args.file:
        md_files = [CONTENT_PATH / args.file]
    else:
        md_files = sorted([f for f in CONTENT_PATH.glob("*.md") if f.name != "_index.md"])

    if args.limit:
        md_files = md_files[:args.limit]

    print(f"{'[DRY RUN] ' if args.dry_run else ''}Processing {len(md_files)} blog posts...\n")

    # Category stats
    category_counts = {"buyers": 0, "sellers": 0, "landlords": 0, "realtors": 0}
    processed = 0
    skipped = 0

    for filepath in md_files:
        result = process_blog_post(filepath, dry_run=args.dry_run)

        if result["status"] == "processed":
            processed += 1
            for cat in result.get("categories", []):
                category_counts[cat] = category_counts.get(cat, 0) + 1

            print(f"✓ {result['file']}")
            print(f"  Title: {result['title']}")
            print(f"  Categories: {result['categories']}")
            if args.dry_run:
                for change in result.get('changes', []):
                    print(f"  - {change}")
            print()
        else:
            skipped += 1
            print(f"✗ {result['file']} - {result.get('reason', 'unknown')}")

    print("\n" + "="*50)
    print(f"{'[DRY RUN] ' if args.dry_run else ''}Summary:")
    print(f"  Processed: {processed}")
    print(f"  Skipped: {skipped}")
    print(f"\nCategory Distribution:")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

    if args.dry_run:
        print("\nRun without --dry-run to apply changes.")


if __name__ == "__main__":
    main()

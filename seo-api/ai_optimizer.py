"""
AI-powered SEO Optimizer using Claude API
Humanizes content, optimizes for SEO, and manages internal linking
"""

import os
import re
import json
from typing import Optional
from dataclasses import dataclass
import anthropic
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


# Initialize Claude client
def get_claude_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    return anthropic.Anthropic(api_key=api_key)


# Model configuration
HAIKU_MODEL = "claude-3-5-haiku-20241022"
SONNET_MODEL = "claude-sonnet-4-20250514"


@dataclass
class OptimizationResult:
    """Result of an AI optimization task"""
    original: str
    optimized: str
    explanation: str
    confidence: float  # 0-1 confidence score


@dataclass
class InternalLinkSuggestion:
    """Suggested internal link"""
    anchor_text: str
    target_url: str
    target_title: str
    context_sentence: str
    relevance_score: float
    insertion_point: int  # Character position in content


class SEOOptimizer:
    """AI-powered SEO optimization engine"""

    def __init__(self):
        self.client = get_claude_client()
        self.post_index = {}  # slug -> {title, content, keywords}
        self.tfidf_vectorizer = None
        self.tfidf_matrix = None
        self.slugs = []

    def build_content_index(self, posts: list[dict]):
        """Build TF-IDF index for semantic similarity matching"""
        self.post_index = {}
        self.slugs = []
        documents = []

        for post in posts:
            slug = post.get('slug', '')
            title = post.get('title', '')
            content = post.get('content', '')
            keywords = post.get('target_keyword', '')
            categories = post.get('categories', [])

            # Combine text for similarity matching
            combined_text = f"{title} {keywords} {' '.join(categories)} {content}"

            self.post_index[slug] = {
                'title': title,
                'content': content,
                'keywords': keywords,
                'categories': categories,
                'url': f"/blog/{slug}/"
            }
            self.slugs.append(slug)
            documents.append(combined_text)

        # Build TF-IDF matrix
        if documents:
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=5000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(documents)

    def find_related_posts(self, slug: str, top_n: int = 5) -> list[dict]:
        """Find semantically related posts using TF-IDF similarity"""
        if slug not in self.slugs or self.tfidf_matrix is None:
            return []

        idx = self.slugs.index(slug)
        post_vector = self.tfidf_matrix[idx]

        # Calculate cosine similarity with all other posts
        similarities = cosine_similarity(post_vector, self.tfidf_matrix).flatten()

        # Get top N similar posts (excluding self)
        similar_indices = similarities.argsort()[::-1][1:top_n+1]

        related = []
        for i in similar_indices:
            if similarities[i] > 0.1:  # Minimum similarity threshold
                related_slug = self.slugs[i]
                related.append({
                    'slug': related_slug,
                    'title': self.post_index[related_slug]['title'],
                    'url': self.post_index[related_slug]['url'],
                    'similarity': float(similarities[i])
                })

        return related

    async def generate_meta_description(
        self,
        title: str,
        content: str,
        target_keyword: str = ""
    ) -> OptimizationResult:
        """Generate SEO-optimized meta description using Haiku"""

        prompt = f"""You are an SEO expert writing meta descriptions for Grand Prix Realty, a Las Vegas real estate company.

TASK: Write a compelling meta description (120-155 characters) for this blog post.

CRITICAL LOCATION RULE:
- This blog is EXCLUSIVELY about LAS VEGAS, Nevada real estate
- NEVER mention other cities like Austin, Tampa, Miami, Phoenix, Denver, etc.
- If the existing content mentions other cities, IGNORE those references
- Focus ONLY on Las Vegas, Henderson, North Las Vegas, Summerlin, and Southern Nevada

REQUIREMENTS:
- Must be 120-155 characters (this is critical for Google)
- Include the target keyword naturally if provided
- Write in active voice, be specific
- Include a subtle call-to-action
- Sound human and conversational, NOT robotic or AI-generated
- Focus on what the reader will learn or gain
- Keep the Las Vegas focus even if content mentions other markets

BLOG POST:
Title: {title}
Target Keyword: {target_keyword or "None specified"}

Content Preview:
{content[:2000]}

Respond with ONLY the meta description text, nothing else. No quotes, no explanation."""

        response = self.client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        optimized = response.content[0].text.strip().strip('"')

        # Validate length
        if len(optimized) < 120:
            confidence = 0.7
        elif len(optimized) > 160:
            optimized = optimized[:157] + "..."
            confidence = 0.8
        else:
            confidence = 0.95

        return OptimizationResult(
            original="",
            optimized=optimized,
            explanation=f"Generated {len(optimized)} character meta description targeting '{target_keyword}'",
            confidence=confidence
        )

    async def optimize_title(
        self,
        current_title: str,
        content: str,
        target_keyword: str = ""
    ) -> OptimizationResult:
        """Optimize blog title for SEO using Haiku"""

        prompt = f"""You are an SEO expert optimizing blog titles for Grand Prix Realty, a Las Vegas real estate company.

TASK: Optimize this title for SEO and click-through rate.

CURRENT TITLE: {current_title}
TARGET KEYWORD: {target_keyword or "None specified"}

CRITICAL LOCATION RULE:
- This blog is EXCLUSIVELY about LAS VEGAS, Nevada real estate
- NEVER mention other cities like Austin, Tampa, Miami, Phoenix, Denver, etc.
- If the existing title mentions other cities, REPLACE them with "Las Vegas" or remove them
- Focus ONLY on Las Vegas, Henderson, North Las Vegas, Summerlin, and Southern Nevada

REQUIREMENTS:
- Keep it 50-60 characters (ideal for Google)
- Include target keyword near the beginning if possible
- Make it compelling and click-worthy
- Sound natural and human, not keyword-stuffed
- If the current title is already good, make minimal changes
- Ensure the title reflects Las Vegas real estate focus

CONTENT PREVIEW:
{content[:1500]}

Respond in this exact JSON format:
{{"title": "Your optimized title here", "changes": "Brief explanation of changes made"}}"""

        response = self.client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        try:
            response_text = response.content[0].text.strip()
            # Try to extract JSON from the response (in case there's extra text)
            json_match = re.search(r'\{[^{}]*"title"[^{}]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(response_text)
            optimized = result.get('title', current_title)
            explanation = result.get('changes', 'Title optimized')
        except (json.JSONDecodeError, AttributeError):
            # Fallback if JSON parsing fails - try to extract just the title
            response_text = response.content[0].text.strip()
            # Look for quoted title after "title":
            title_match = re.search(r'"title"\s*:\s*"([^"]+)"', response_text)
            if title_match:
                optimized = title_match.group(1)
                explanation = "Title optimized for SEO"
            else:
                optimized = current_title
                explanation = "Could not parse AI response, keeping original title"

        # Calculate confidence based on changes
        if optimized.lower() == current_title.lower():
            confidence = 1.0
            explanation = "Title already well-optimized"
        elif len(optimized) > 60:
            confidence = 0.75
        else:
            confidence = 0.9

        return OptimizationResult(
            original=current_title,
            optimized=optimized,
            explanation=explanation,
            confidence=confidence
        )

    async def improve_content(
        self,
        content: str,
        title: str,
        target_keyword: str = ""
    ) -> OptimizationResult:
        """Improve content quality and humanize using Sonnet"""

        prompt = f"""You are an expert content editor for Grand Prix Realty, a Las Vegas real estate company blog. Your job is to improve content quality while making it sound more human and less AI-generated.

BLOG POST TITLE: {title}
TARGET KEYWORD: {target_keyword or "Not specified"}

CURRENT CONTENT:
{content}

CRITICAL LOCATION RULE - THIS IS MANDATORY:
- This blog is EXCLUSIVELY about LAS VEGAS, Nevada real estate
- REMOVE or REPLACE any mentions of other cities (Austin, Tampa, Miami, Phoenix, Denver, Dallas, Atlanta, etc.)
- Replace other city references with Las Vegas equivalents or remove the sentences entirely
- Focus ONLY on Las Vegas, Henderson, North Las Vegas, Summerlin, and Southern Nevada
- If content compares markets, reframe it to focus on Las Vegas advantages

TASKS:
1. LOCALIZE TO LAS VEGAS:
   - Remove ALL mentions of non-Las Vegas cities and markets
   - Replace with Las Vegas-specific information where possible
   - Maintain focus on Southern Nevada real estate

2. HUMANIZE the writing:
   - Add personality and conversational tone
   - Remove overly perfect or robotic phrasing
   - Add occasional contractions (don't, won't, it's)
   - Include rhetorical questions where appropriate
   - Vary sentence structure and length
   - Add transitional phrases that feel natural

3. SEO OPTIMIZATION:
   - Ensure target keyword appears naturally 2-4 times
   - Improve heading structure (use H2, H3 appropriately)
   - Add semantic variations of the keyword
   - Ensure first paragraph hooks the reader

4. READABILITY:
   - Break up long paragraphs (max 3-4 sentences)
   - Use bullet points or lists where appropriate
   - Ensure clear flow between sections

5. DO NOT:
   - Keep any references to cities outside of Las Vegas/Nevada
   - Add fake statistics or claims
   - Remove important Las Vegas-specific content
   - Over-optimize for keywords (no stuffing)

Return the improved content in the same HTML format. Only return the improved content, no explanations."""

        response = self.client.messages.create(
            model=SONNET_MODEL,
            max_tokens=8000,
            messages=[{"role": "user", "content": prompt}]
        )

        optimized = response.content[0].text.strip()

        # Calculate rough metrics for explanation
        original_words = len(content.split())
        optimized_words = len(optimized.split())

        return OptimizationResult(
            original=content,
            optimized=optimized,
            explanation=f"Content humanized and optimized. Words: {original_words} → {optimized_words}",
            confidence=0.85
        )

    async def suggest_internal_links(
        self,
        slug: str,
        content: str,
        existing_links: list[str] = None
    ) -> list[InternalLinkSuggestion]:
        """Suggest semantic internal links using Haiku"""

        existing_links = existing_links or []

        # Find related posts
        related_posts = self.find_related_posts(slug, top_n=10)

        if not related_posts:
            return []

        # Filter out already linked posts
        available_posts = [
            p for p in related_posts
            if p['url'] not in existing_links and p['slug'] not in existing_links
        ]

        if not available_posts:
            return []

        # Use Claude to find natural anchor text opportunities
        related_info = "\n".join([
            f"- {p['title']} (URL: {p['url']}, Relevance: {p['similarity']:.2f})"
            for p in available_posts[:5]
        ])

        prompt = f"""You are an SEO expert finding natural internal linking opportunities.

CURRENT BLOG POST CONTENT:
{content[:4000]}

RELATED POSTS TO LINK TO:
{related_info}

TASK: Find 2-4 natural places in the content where we can add internal links to the related posts.

REQUIREMENTS:
- Links must be SEMANTICALLY relevant (topic connection)
- Anchor text must be natural phrases already in the content (or slight modifications)
- Don't force links where they don't fit
- Prefer linking from informative sentences, not headers
- Each link should use different anchor text

Respond in this exact JSON format:
{{
  "suggestions": [
    {{
      "target_url": "/blog/post-slug/",
      "target_title": "Post Title",
      "anchor_text": "natural phrase from content",
      "context": "The sentence where this link would go",
      "reasoning": "Why this link makes sense"
    }}
  ]
}}

If no good linking opportunities exist, return {{"suggestions": []}}"""

        response = self.client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )

        try:
            result = json.loads(response.content[0].text)
            suggestions = result.get('suggestions', [])
        except json.JSONDecodeError:
            return []

        # Convert to InternalLinkSuggestion objects
        link_suggestions = []
        for s in suggestions:
            # Find position in content
            anchor = s.get('anchor_text', '')
            position = content.lower().find(anchor.lower())

            # Find the related post for similarity score
            target_url = s.get('target_url', '')
            relevance = 0.5
            for p in available_posts:
                if p['url'] == target_url:
                    relevance = p['similarity']
                    break

            link_suggestions.append(InternalLinkSuggestion(
                anchor_text=anchor,
                target_url=target_url,
                target_title=s.get('target_title', ''),
                context_sentence=s.get('context', ''),
                relevance_score=relevance,
                insertion_point=position if position >= 0 else 0
            ))

        return link_suggestions

    def apply_internal_link(
        self,
        content: str,
        anchor_text: str,
        target_url: str
    ) -> str:
        """Insert an internal link into content"""

        # Find the anchor text in content (case-insensitive)
        pattern = re.compile(re.escape(anchor_text), re.IGNORECASE)

        # Only replace first occurrence that's not already a link
        def replace_if_not_linked(match):
            # Check if already inside a link
            start = match.start()
            preceding = content[max(0, start-50):start]
            if '<a ' in preceding and '</a>' not in preceding:
                return match.group(0)
            return f'<a href="{target_url}">{match.group(0)}</a>'

        new_content = pattern.sub(replace_if_not_linked, content, count=1)
        return new_content


# Singleton instance
_optimizer: Optional[SEOOptimizer] = None

def get_optimizer() -> SEOOptimizer:
    global _optimizer
    if _optimizer is None:
        _optimizer = SEOOptimizer()
    return _optimizer

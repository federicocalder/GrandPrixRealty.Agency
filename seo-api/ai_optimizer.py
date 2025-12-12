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
class UnifiedSEOResult:
    """Result of unified SEO optimization - coordinated keyword, title, description"""
    keyword: str
    title: str
    description: str
    keyword_explanation: str
    title_explanation: str
    description_explanation: str
    keyword_in_title: bool
    keyword_in_description: bool
    confidence: float


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

    async def suggest_target_keyword(
        self,
        title: str,
        content: str,
        current_keyword: str = ""
    ) -> OptimizationResult:
        """Suggest optimal target keyword using Haiku"""

        prompt = f"""You are an SEO keyword research expert for Grand Prix Realty, a Las Vegas real estate company.

TASK: Suggest the best target keyword for this blog post.

BLOG POST TITLE: {title}
CURRENT KEYWORD: {current_keyword or "None"}

CONTENT PREVIEW:
{content[:2500]}

REQUIREMENTS:
- Keyword should be 2-4 words (long-tail preferred)
- Must be relevant to Las Vegas real estate
- Should have search intent (what people actually search)
- Be specific, not generic (e.g., "las vegas first time homebuyer" not just "homebuyer")
- Consider: buyer intent, seller intent, location-specific, property type

EXAMPLES OF GOOD KEYWORDS:
- "las vegas home inspection"
- "henderson nv property management"
- "sell house fast las vegas"
- "summerlin homes for sale"
- "las vegas real estate market 2025"

Respond in JSON format:
{{"keyword": "your suggested keyword", "reasoning": "brief explanation"}}"""

        response = self.client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        try:
            result = json.loads(response.content[0].text.strip())
            keyword = result.get('keyword', current_keyword or '')
            explanation = result.get('reasoning', 'Keyword suggested based on content analysis')
        except json.JSONDecodeError:
            keyword = current_keyword or ''
            explanation = 'Could not parse AI response'

        return OptimizationResult(
            original=current_keyword or '',
            optimized=keyword,
            explanation=explanation,
            confidence=0.85 if keyword else 0.0
        )

    async def suggest_category(
        self,
        title: str,
        content: str,
        current_categories: list[str] = None
    ) -> OptimizationResult:
        """Suggest single best category from silo structure using Haiku"""

        current_categories = current_categories or []

        prompt = f"""You are an SEO content strategist for Grand Prix Realty, a Las Vegas real estate company.

TASK: Choose the SINGLE best category for this blog post.

AVAILABLE CATEGORIES (pick exactly ONE):
- Buyers (homebuyer content, buying guides, financing, first-time buyers)
- Sellers (selling guides, home prep, pricing, staging, market timing)
- Property Management (landlord content, rental management, tenant screening)
- Realtors (agent resources, industry news, professional development)
- Las Vegas (local market news, neighborhood guides, community info)

BLOG POST TITLE: {title}
CURRENT CATEGORIES: {', '.join(current_categories) if current_categories else 'None'}

CONTENT PREVIEW:
{content[:2000]}

RULES:
- Pick the PRIMARY audience/topic, not secondary themes
- "Buyers" = content primarily helping people BUY homes
- "Sellers" = content primarily helping people SELL homes
- "Property Management" = content for landlords/investors managing rentals
- "Realtors" = content for real estate professionals
- "Las Vegas" = general local content not specific to buying/selling/managing

Respond in JSON format:
{{"category": "Buyers", "reasoning": "brief explanation"}}"""

        response = self.client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        try:
            result = json.loads(response.content[0].text.strip())
            category = result.get('category', '')
            explanation = result.get('reasoning', 'Category suggested based on content analysis')

            # Validate category is one of allowed values
            allowed = ['Buyers', 'Sellers', 'Property Management', 'Realtors', 'Las Vegas']
            if category not in allowed:
                # Try to match partial
                for a in allowed:
                    if a.lower() in category.lower():
                        category = a
                        break
                else:
                    category = current_categories[0] if current_categories else 'Property Management'

        except json.JSONDecodeError:
            category = current_categories[0] if current_categories else 'Property Management'
            explanation = 'Could not parse AI response, using default'

        return OptimizationResult(
            original=', '.join(current_categories) if current_categories else '',
            optimized=category,
            explanation=explanation,
            confidence=0.9
        )

    async def generate_unified_seo(
        self,
        content: str,
        current_title: str,
        current_description: str = "",
        current_keyword: str = "",
        category: str = ""
    ) -> UnifiedSEOResult:
        """
        Generate coordinated SEO elements in ONE call to guarantee alignment.

        The keyword will appear EXACTLY in both title and description.
        This solves the problem of separate AI calls generating mismatched elements.
        """

        prompt = f"""You are an expert SEO strategist for Grand Prix Realty, a Las Vegas real estate company.

TASK: Generate COORDINATED SEO elements where the keyword appears in BOTH the title and description.

CURRENT VALUES:
- Title: {current_title}
- Description: {current_description or "None"}
- Keyword: {current_keyword or "None"}
- Category/Silo: {category or "Not specified"}

CONTENT TO ANALYZE:
{content[:3500]}

CRITICAL RULES:
1. First, identify the BEST target keyword (2-4 words)
2. The title MUST contain the EXACT keyword phrase (not variations)
3. The meta description MUST contain the EXACT keyword phrase
4. Keyword should reflect the primary entity (e.g., "home loans" not just "loans")
5. Focus on Las Vegas real estate - NEVER mention other cities

REQUIREMENTS:
- Keyword: 2-4 words, specific, searchable (e.g., "1099 home loans las vegas")
- Title: 50-60 characters, contains EXACT keyword, compelling
- Description: 120-155 characters, contains EXACT keyword, has call-to-action

EXAMPLES OF COORDINATED OUTPUT:
Example 1:
- Keyword: "las vegas first time homebuyer"
- Title: "Las Vegas First Time Homebuyer Guide: Your Path to Ownership"
- Description: "Ready to become a las vegas first time homebuyer? Our expert guide covers financing, neighborhoods, and tips to find your dream home."

Example 2:
- Keyword: "sell house fast las vegas"
- Title: "Sell House Fast Las Vegas: Get Top Dollar in 30 Days"
- Description: "Need to sell house fast las vegas? Learn proven strategies to attract buyers quickly while maximizing your home's value in today's market."

Respond in this EXACT JSON format:
{{
    "keyword": "your 2-4 word keyword",
    "title": "Title containing the EXACT keyword (50-60 chars)",
    "description": "Description containing the EXACT keyword (120-155 chars)",
    "keyword_explanation": "Why this keyword is optimal",
    "title_explanation": "How title incorporates keyword naturally",
    "description_explanation": "How description uses keyword with CTA"
}}"""

        response = self.client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )

        try:
            response_text = response.content[0].text.strip()
            # Try to extract JSON
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = json.loads(response_text)

            keyword = result.get('keyword', current_keyword or '')
            title = result.get('title', current_title)
            description = result.get('description', current_description or '')
            keyword_explanation = result.get('keyword_explanation', 'Keyword optimized for search intent')
            title_explanation = result.get('title_explanation', 'Title optimized with keyword')
            description_explanation = result.get('description_explanation', 'Description optimized with keyword')

        except (json.JSONDecodeError, AttributeError) as e:
            # Fallback to current values
            keyword = current_keyword or ''
            title = current_title
            description = current_description or ''
            keyword_explanation = f'Could not parse AI response: {str(e)}'
            title_explanation = 'Using original title'
            description_explanation = 'Using original description'

        # Verify keyword alignment
        keyword_lower = keyword.lower()
        keyword_in_title = keyword_lower in title.lower() if keyword else False
        keyword_in_description = keyword_lower in description.lower() if keyword else False

        # Calculate confidence based on alignment
        if keyword_in_title and keyword_in_description:
            confidence = 0.95
        elif keyword_in_title or keyword_in_description:
            confidence = 0.7
        else:
            confidence = 0.4

        # Validate lengths
        if len(title) > 65:
            title = title[:62] + "..."
        if len(description) > 160:
            description = description[:157] + "..."
        elif len(description) < 100 and description:
            confidence -= 0.1

        return UnifiedSEOResult(
            keyword=keyword,
            title=title,
            description=description,
            keyword_explanation=keyword_explanation,
            title_explanation=title_explanation,
            description_explanation=description_explanation,
            keyword_in_title=keyword_in_title,
            keyword_in_description=keyword_in_description,
            confidence=max(0, confidence)
        )

    async def expand_content_iteratively(
        self,
        content: str,
        keyword: str,
        title: str,
        min_words: int = 800
    ) -> tuple[str, list[str]]:
        """
        Expand content to meet minimum word count using structured additions.

        Returns: (expanded_content, list_of_sections_added)

        Process:
        1. Count current words
        2. If below minimum, identify what's missing
        3. Ask AI to add ONE specific section
        4. Count again, repeat if needed
        5. Maximum 3 iterations to prevent over-expansion
        """

        current_words = len(content.split())
        iterations = 0
        max_iterations = 3
        sections_added = []

        while current_words < min_words and iterations < max_iterations:
            # Determine what type of content to add
            expansion_type = self._determine_expansion_type(content, current_words, min_words)

            if expansion_type is None:
                break  # No more expansion types available

            # Ask AI to add specific section
            expanded, section_name = await self._add_section(content, keyword, title, expansion_type)

            if expanded and expanded != content:
                content = expanded
                sections_added.append(section_name)
                current_words = len(content.split())
            else:
                break  # AI couldn't expand further

            iterations += 1

        return content, sections_added

    def _determine_expansion_type(self, content: str, current_words: int, min_words: int) -> str | None:
        """Decide what type of content to add based on what's missing."""

        content_lower = content.lower()

        # Priority 1: Key Takeaways (always valuable, appears at top)
        if "key takeaway" not in content_lower and "takeaway" not in content_lower:
            return "key_takeaways"

        # Priority 2: FAQ Section (great for SEO, appears at bottom)
        if "faq" not in content_lower and "frequently asked" not in content_lower and "common question" not in content_lower:
            return "faq_section"

        # Priority 3: Local Las Vegas context
        vegas_mentions = content_lower.count("las vegas") + content_lower.count("vegas")
        if vegas_mentions < 3:
            return "local_context"

        # Priority 4: Expand existing content (if still below minimum)
        if current_words < min_words - 100:
            return "expand_sections"

        return None

    async def _add_section(
        self,
        content: str,
        keyword: str,
        title: str,
        expansion_type: str
    ) -> tuple[str, str]:
        """Add a specific section type to the content."""

        section_prompts = {
            "key_takeaways": f"""Add a "Key Takeaways" section at the VERY BEGINNING of this article (after any intro paragraph).

REQUIREMENTS:
- Use heading: ## Key Takeaways
- Include 4-5 bullet points summarizing the most important information
- Keep each bullet to 1-2 sentences
- Include the keyword "{keyword}" naturally in at least one bullet
- Make bullets actionable and specific to Las Vegas

Article Title: {title}
Current Content:
{content}

Return the COMPLETE article with the Key Takeaways section added at the beginning.""",

            "faq_section": f"""Add a "Frequently Asked Questions" section at the END of this article (before any conclusion).

REQUIREMENTS:
- Use heading: ## Frequently Asked Questions
- Include 4-5 Q&A pairs that readers would commonly ask
- Questions should be specific and searchable
- Include the keyword "{keyword}" naturally in at least one Q&A
- Focus on Las Vegas-specific questions where relevant
- Format: **Q: Question?** followed by answer paragraph

Article Title: {title}
Target Keyword: {keyword}
Current Content:
{content}

Return the COMPLETE article with the FAQ section added near the end.""",

            "local_context": f"""Enhance this article with more Las Vegas-specific information.

REQUIREMENTS:
- Add a section about Las Vegas market specifics OR expand existing sections
- Include Las Vegas neighborhoods (Summerlin, Henderson, North Las Vegas, etc.)
- Add local market conditions or Nevada-specific regulations if relevant
- Naturally incorporate "{keyword}" where appropriate
- Add 100-150 words of Las Vegas-focused content

Article Title: {title}
Target Keyword: {keyword}
Current Content:
{content}

Return the COMPLETE article with enhanced Las Vegas content.""",

            "expand_sections": f"""Expand the shortest or thinnest sections of this article.

REQUIREMENTS:
- Find sections that are underdeveloped (< 100 words)
- Add more detail, examples, or practical tips
- Add 150-200 words total across expansions
- Maintain focus on "{keyword}" and Las Vegas context
- Don't add new sections, just expand existing ones

Article Title: {title}
Target Keyword: {keyword}
Current Content:
{content}

Return the COMPLETE expanded article."""
        }

        section_names = {
            "key_takeaways": "Key Takeaways",
            "faq_section": "FAQ Section",
            "local_context": "Las Vegas Context",
            "expand_sections": "Expanded Sections"
        }

        prompt = section_prompts.get(expansion_type)
        if not prompt:
            return content, ""

        response = self.client.messages.create(
            model=SONNET_MODEL,  # Use Sonnet for content expansion (better quality)
            max_tokens=8000,
            messages=[{"role": "user", "content": prompt}]
        )

        expanded = response.content[0].text.strip()

        # Validate expansion actually added content
        if len(expanded.split()) <= len(content.split()):
            return content, ""

        return expanded, section_names.get(expansion_type, expansion_type)

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

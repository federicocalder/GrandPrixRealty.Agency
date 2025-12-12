# Unified SEO Optimization - Implementation Plan

## Problem Statement

Current AI optimizer generates SEO elements **separately**, causing misalignment:
- `suggest_target_keyword()` → "1099 home loans las vegas"
- `optimize_title()` → "1099 Loans in Las Vegas..." (doesn't contain "home loans")
- `generate_meta_description()` → May or may not include the keyword
- `improve_content()` → Doesn't know what keyword to emphasize

**Result**: Analyzer scores are low (38/100) because keyword doesn't match title/description exactly.

## Solution: Unified SEO Optimization

Generate ALL SEO elements in **ONE coordinated AI call** to guarantee alignment.

---

## Phase 1: Coordinated SEO Elements

### New Method: `generate_unified_seo()`

Single AI call that returns:
```python
{
    "keyword": "1099 home loans las vegas",
    "title": "1099 Home Loans in Las Vegas: Self-Employed Homebuyer Guide",  # Contains keyword
    "description": "Discover 1099 home loans in Las Vegas for self-employed buyers...",  # Contains keyword
    "keyword_explanation": "Why this keyword was chosen",
    "title_explanation": "Why this title works",
    "description_explanation": "Why this description works"
}
```

### AI Prompt Structure
```
You are an SEO expert. Analyze this blog post and generate COORDINATED SEO elements.

CRITICAL RULES:
1. First, identify the BEST target keyword (2-4 words)
2. The title MUST contain the EXACT keyword phrase
3. The meta description MUST contain the EXACT keyword phrase
4. Keyword should reflect the primary entity/topic (e.g., "home loans" not just "loans")

Content to analyze:
{content}

Current silo/category: {category}
Location focus: Las Vegas, Nevada

Return JSON:
{
    "keyword": "exact target keyword phrase",
    "title": "SEO title under 60 chars containing the exact keyword",
    "description": "Meta description 120-155 chars containing the exact keyword",
    "keyword_explanation": "brief explanation",
    "title_explanation": "brief explanation",
    "description_explanation": "brief explanation"
}
```

---

## Phase 2: Iterative Content Expansion

LLMs cannot reliably count words. Use programmatic approach.

### Content Expansion Roadmap

When content is below target word count (800+ words), add sections in this order:

| Priority | Section Type | Target Words | When to Add |
|----------|-------------|--------------|-------------|
| 1 | Key Takeaways | 100-150 | Always if missing |
| 2 | FAQ Section | 200-300 | If < 700 words |
| 3 | Expand Thin Sections | 100-200 | If sections < 100 words |
| 4 | Add Local Context | 100-150 | If no Las Vegas specifics |
| 5 | Add Statistics/Data | 50-100 | If no numbers/data |

### Method: `expand_content_iteratively()`

```python
def expand_content_iteratively(self, content: str, keyword: str, min_words: int = 800) -> str:
    """
    Expand content to meet minimum word count using structured additions.

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

    while current_words < min_words and iterations < max_iterations:
        # Determine what to add
        expansion_type = self._determine_expansion_type(content, current_words, min_words)

        # Ask AI to add specific section
        expanded = self._add_section(content, keyword, expansion_type)

        content = expanded
        current_words = len(content.split())
        iterations += 1

    return content
```

### Expansion Type Logic

```python
def _determine_expansion_type(self, content: str, current_words: int, min_words: int) -> str:
    """Decide what type of content to add based on what's missing."""

    content_lower = content.lower()

    # Priority 1: Key Takeaways (always valuable)
    if "key takeaway" not in content_lower and "takeaway" not in content_lower:
        return "key_takeaways"

    # Priority 2: FAQ Section (great for SEO)
    if "faq" not in content_lower and "frequently asked" not in content_lower:
        return "faq_section"

    # Priority 3: Local context for Las Vegas
    vegas_mentions = content_lower.count("las vegas") + content_lower.count("vegas")
    if vegas_mentions < 3:
        return "local_context"

    # Priority 4: Expand existing sections
    return "expand_sections"
```

### Section-Specific Prompts

#### Key Takeaways
```
Add a "Key Takeaways" section at the beginning of this article.
Include 4-5 bullet points summarizing the most important information.
Make sure to include the keyword "{keyword}" naturally in at least one bullet point.

Article:
{content}
```

#### FAQ Section
```
Add a "Frequently Asked Questions" section at the end of this article.
Include 4-5 questions and answers that readers would commonly ask.
Make sure to include the keyword "{keyword}" naturally in the Q&A.
Focus on Las Vegas-specific questions where relevant.

Article:
{content}
```

#### Local Context
```
Enhance this article with more Las Vegas-specific information.
Add local context such as:
- Las Vegas neighborhoods or areas
- Local market conditions
- Nevada-specific regulations
- Local resources or contacts

Naturally incorporate "{keyword}" where appropriate.

Article:
{content}
```

#### Expand Sections
```
This article needs more depth. Find the shortest section and expand it with:
- More detailed explanations
- Examples or scenarios
- Practical tips

Maintain focus on "{keyword}" and Las Vegas context.

Article:
{content}
```

---

## Phase 3: Content Quality Guidelines

### Keyword Density Rules
- Target: 2-4 keyword appearances in content
- Don't stuff: Max 1 per 200 words
- Natural placement: intro, one H2, conclusion

### Content Structure
```markdown
# {Title with Keyword}

**Key Takeaways** (if added)
- Bullet 1
- Bullet 2 (contains keyword)
- Bullet 3
- Bullet 4

## Introduction
First paragraph contains keyword naturally.

## Section 1
...

## Section 2
Contains keyword once.

## Section 3 (Las Vegas specific)
...

## FAQ (if added)
**Q: Question about {keyword}?**
A: Answer...

## Conclusion
Restate keyword naturally.
```

---

## File Changes Required

### 1. `seo-api/ai_optimizer.py`

**Add new method:**
```python
async def generate_unified_seo(self, content: str, current_title: str,
                                current_description: str, category: str) -> dict:
    """Generate coordinated keyword + title + description in one call."""
    # Implementation here
```

**Add new method:**
```python
async def expand_content_iteratively(self, content: str, keyword: str,
                                      min_words: int = 800) -> str:
    """Expand content to meet minimum word count."""
    # Implementation here
```

**Modify existing methods to accept keyword parameter:**
- `improve_content()` should accept `target_keyword` parameter

### 2. `seo-api/main.py`

**Update `/seo/ai/optimize` endpoint:**
- Call `generate_unified_seo()` first
- Pass keyword to content improvement
- Return coordinated results

**Update `OptimizationPreview` model:**
```python
class OptimizationPreview(BaseModel):
    # Existing fields...

    # New unified fields
    unified_keyword: Optional[str] = None
    unified_title: Optional[str] = None
    unified_description: Optional[str] = None
    keyword_in_title: bool = False  # Verification flag
    keyword_in_description: bool = False  # Verification flag
```

### 3. `seo-frontend/src/pages/PostDetail.tsx`

**Update UI to show:**
- Keyword alignment indicators (✓ keyword in title, ✓ keyword in description)
- Word count before/after expansion
- Expansion sections added (FAQ, Key Takeaways, etc.)

---

## Expected Results

### Before (Current)
| Metric | Score | Reason |
|--------|-------|--------|
| Title | 50 | Keyword mismatch |
| Description | 50 | Keyword mismatch |
| Keyword | 20 | Not in title/description |
| Content | 50 | Below word count, low keyword density |
| Links | 0 | No internal links (expected) |
| Readability | 80 | Good |
| **Overall** | **38** | |

### After (Unified)
| Metric | Score | Reason |
|--------|-------|--------|
| Title | 100 | Contains exact keyword |
| Description | 100 | Contains exact keyword |
| Keyword | 100 | In title + description + content |
| Content | 80-90 | 800+ words, good keyword density |
| Links | 0 | No internal links (roadmap) |
| Readability | 75-85 | May vary with expansion |
| **Overall** | **75-85** | |

---

## Implementation Order

1. **Phase 1A**: Implement `generate_unified_seo()` method
2. **Phase 1B**: Update `/seo/ai/optimize` to use unified method
3. **Phase 1C**: Update frontend to show alignment indicators
4. **Test Phase 1**: Verify keyword appears in title/description
5. **Phase 2A**: Implement `expand_content_iteratively()` method
6. **Phase 2B**: Add section-specific expansion prompts
7. **Phase 2C**: Update frontend to show word count/sections added
8. **Test Phase 2**: Verify content reaches 800+ words
9. **Phase 3**: Fine-tune prompts based on results

---

## Notes

- Links score (20%) will remain 0 until internal linking feature is built (roadmap)
- Maximum achievable score without links: ~80/100
- With future internal linking: 95-100/100 achievable

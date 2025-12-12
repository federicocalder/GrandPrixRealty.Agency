# SEO Lab - Single Post Optimizer

## Overview
Add AI optimization controls directly to the single post detail page (`/posts/:slug`), making it a complete optimization workstation.

## Features

### 1. Optimize Button
- Single "🔧 Optimize This Post" button on the post detail page
- Calls existing `/seo/ai/optimize` endpoint

### 2. AI Suggestions (New fields in API response)
- **Suggested Title** - shorter, SEO-friendly (< 60 chars)
- **Suggested Description** - 120-155 chars
- **Suggested Target Keyword** - NEW: AI analyzes content
- **Suggested Category** - NEW: AI picks ONE from: Buyers, Sellers, Property Management, Realtors, Las Vegas
- **Content improvements** (optional)
- **Internal link suggestions**

### 3. Review & Apply
- Checkboxes for each suggestion
- Preview diffs (current vs suggested)
- "Apply Selected Changes" button

### 4. Re-analyze
- After applying, re-run analyzer on this post
- Refresh scores on the page without full reload

### 5. Deploy
- "Deploy to Live Site" button
- Same as AIFixer deploy

## API Changes

### `/seo/ai/optimize` - Response now includes:
```json
{
  "original_keyword": "current keyword or null",
  "suggested_keyword": "las vegas home buying",
  "keyword_explanation": "why this keyword is better",
  "original_categories": ["Buyers", "Sellers"],
  "suggested_category": "Buyers",
  "category_explanation": "why this category is best fit"
}
```

### `/seo/ai/apply` - Request now accepts:
```json
{
  "apply_keyword": true,
  "new_keyword": "las vegas home buying",
  "apply_category": true,
  "new_category": "Buyers"
}
```

### NEW: `/seo/analyze/{slug}` (POST)
- Re-runs analyzer on single post
- Returns updated scores and overall_score
- Faster than full site analysis

## Files Modified

1. ✅ `seo-api/ai_optimizer.py` - Added `suggest_target_keyword()` and `suggest_category()` methods
2. ✅ `seo-api/main.py` - Added reanalyze endpoint, updated OptimizationPreview, ApplyOptimizationRequest
3. ✅ `seo-api/analyzer.py` - Added `--single` flag for single file analysis
4. 🔄 `seo-frontend/src/pages/PostDetail.tsx` - Add optimizer UI (IN PROGRESS)
5. [ ] `seo-frontend/src/api/seo.ts` - Add reanalyze API call

## Implementation Status

1. ✅ Document plan (this file)
2. ✅ API: Add keyword/category to optimize response
3. ✅ API: Add reanalyze endpoint (`/seo/analyze/{slug}`)
4. ✅ API: Update apply endpoint for keyword/category
5. 🔄 Frontend: Add optimizer section to PostDetail (IN PROGRESS)
6. [ ] Test locally
7. [ ] Deploy to Hetzner

## Category to Silo Mapping

| Category | Silo Directory | URL Prefix |
|----------|---------------|------------|
| Buyers | homebuyer | /homebuyer/ |
| Sellers | homeseller | /homeseller/ |
| Property Management | propertymanagement | /propertymanagement/ |
| Realtors | realtors | /realtors/ |
| Las Vegas | lasvegas | /lasvegas/ |

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
2. ✅ `seo-api/main.py` - Added reanalyze endpoint, updated OptimizationPreview, ApplyOptimizationRequest, fixed `find_post_file()` to use filename from DB
3. ✅ `seo-api/analyzer.py` - Added `--single` flag for single file analysis
4. ✅ `seo-frontend/src/pages/PostDetail.tsx` - Added full optimizer UI with checkboxes
5. ✅ `seo-frontend/src/lib/api.ts` - Added reanalyze API call, keyword/category types, cache_purged field

## Implementation Status

1. ✅ Document plan (this file)
2. ✅ API: Add keyword/category to optimize response
3. ✅ API: Add reanalyze endpoint (`/seo/analyze/{slug}`)
4. ✅ API: Update apply endpoint for keyword/category
5. ✅ Frontend: Add optimizer section to PostDetail
6. ✅ Deploy to Hetzner
7. ⚠️ **BUG: Title changes create new slug, orphaning old DB entry**

## Category to Silo Mapping

| Category | Silo Directory | URL Prefix |
|----------|---------------|------------|
| Buyers | homebuyer | /homebuyer/ |
| Sellers | homeseller | /homeseller/ |
| Property Management | propertymanagement | /propertymanagement/ |
| Realtors | realtors | /realtors/ |
| Las Vegas | lasvegas | /lasvegas/ |

---

## Known Issues / TODO

### 🔴 CRITICAL: Slug Changes When Title Changes

**Problem:** When a title is changed via AI optimizer:
1. The markdown file is updated with the new title
2. When re-analyzed, the slug is recalculated from the NEW title
3. This creates a NEW database entry with the new slug
4. The OLD entry becomes orphaned (old issues reference it, causing FK errors)
5. The SEO Lab URL changes, breaking bookmarks

**Current Behavior:**
- `slug` = `slugify(title)` - changes every time title changes
- `filename` = original filename (stable, never changes)

**Recommended Fix:**
Use `filename` as the stable identifier, NOT title-based slug:
1. Change analyzer to use `filename` as slug (not `slugify(title)`)
2. Update `apply` endpoint to NOT change slug when title changes
3. Add cleanup to delete orphaned entries when title changes
4. Store both `slug` (stable, filename-based) and `display_title` (can change)

**Files to Modify:**
- `seo-api/analyzer.py` - Change slug generation to use filename
- `seo-api/main.py` - Update apply endpoint to preserve slug
- Database migration may be needed to fix existing entries

### 🟡 MEDIUM: Re-analyze returns wrong data after title change

After applying a title change, the `reanalyze` endpoint tries to query by the OLD slug but the analyzer creates a NEW slug. Need to:
1. Return the new slug in the apply response
2. Frontend should navigate to new URL after title change

### 🟡 MEDIUM: Category change doesn't move file

When category changes (e.g., from "Property Management" to "Buyers"):
- The frontmatter is updated
- But the file stays in `/propertymanagement/` instead of moving to `/homebuyer/`
- Hugo URL will still be `/propertymanagement/...`

**Fix:** Add file move logic when category changes, or warn user that manual move is needed.

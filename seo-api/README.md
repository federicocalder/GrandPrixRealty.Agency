# SEO Lab API

Backend API for the GPR SEO Lab - analyzes blog posts for SEO health and provides a dashboard for monitoring content optimization.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SEO Lab Stack                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │   SEO Frontend  │     │   Hugo Blog     │                   │
│  │   (React/Vite)  │     │    Content      │                   │
│  │   /seo-lab/     │     │  /content/blog  │                   │
│  └────────┬────────┘     └────────┬────────┘                   │
│           │                       │                             │
│           ▼                       ▼                             │
│  ┌─────────────────────────────────────────┐                   │
│  │           SEO Lab API (FastAPI)         │                   │
│  │           Port 8001 / /seo-api          │                   │
│  ├─────────────────────────────────────────┤                   │
│  │  Endpoints:                              │                   │
│  │  - GET  /health           Health check   │                   │
│  │  - GET  /seo/dashboard    Summary stats  │                   │
│  │  - GET  /seo/posts        List all posts │                   │
│  │  - GET  /seo/posts/{slug} Post details   │                   │
│  │  - GET  /seo/issues       SEO issues     │                   │
│  │  - GET  /seo/links        Link graph     │                   │
│  │  - GET  /seo/attention    Problem posts  │                   │
│  │  - POST /seo/analyze      Run analyzer   │                   │
│  │  - POST /seo/issues/{id}/resolve         │                   │
│  └────────────────────┬────────────────────┘                   │
│                       │                                         │
│                       ▼                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │         Supabase PostgreSQL             │                   │
│  │           Schema: seo                   │                   │
│  ├─────────────────────────────────────────┤                   │
│  │  Tables:                                 │                   │
│  │  - posts            Blog post metrics    │                   │
│  │  - issues           SEO problems found   │                   │
│  │  - internal_links   Link relationships   │                   │
│  │                                          │                   │
│  │  Views:                                  │                   │
│  │  - dashboard_summary   Aggregated stats  │                   │
│  │  - category_stats      Per-category data │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Dashboard
- Total posts count with published/draft breakdown
- Average SEO score across all content
- Score distribution (Excellent 80+, Good 60-79, Needs Work 40-59, Poor <40)
- Word count statistics
- Internal linking metrics
- Issue counts (open/critical)

### Blog Post Analysis
The analyzer scores each post on:
- **Title optimization** (length, keyword presence)
- **Meta description** (exists, length, uniqueness)
- **Headings** (H1 present, heading hierarchy)
- **Content length** (minimum 800+ words recommended)
- **Internal links** (inbound and outbound)
- **External links** (relevant, not broken)
- **Image optimization** (alt text, WordPress image detection)
- **URL structure** (slug optimization)

### Issue Tracking
Issues are categorized by severity:
- **Critical** - Major problems hurting SEO
- **Warning** - Moderate issues to address
- **Info** - Minor suggestions

### Internal Link Graph
Visualizes the internal linking structure to identify:
- Orphan pages (no inbound links)
- Hub pages (many outbound links)
- Popular pages (many inbound links)
- Linking opportunities

## API Endpoints

### `GET /health`
Health check endpoint.
```json
{"status": "ok", "service": "seo-api"}
```

### `GET /seo/dashboard`
Returns dashboard summary statistics.

### `GET /seo/posts`
List posts with filtering and pagination.

Query params:
- `category` - Filter by category
- `min_score` / `max_score` - Score range
- `has_issues` - Only posts with issues
- `sort_by` / `sort_order` - Sorting
- `limit` / `offset` - Pagination

### `GET /seo/posts/{slug}`
Get detailed SEO data for a single post including issues, inbound/outbound links.

### `GET /seo/issues`
List SEO issues across all posts.

Query params:
- `severity` - Filter by severity
- `issue_type` - Filter by type
- `resolved` - Include resolved issues

### `POST /seo/analyze`
Trigger a full re-analysis of all blog posts. Runs the analyzer.py script which:
1. Reads all markdown files from Hugo content directory
2. Parses frontmatter and content
3. Calculates SEO scores
4. Identifies issues
5. Maps internal links
6. Stores results in Supabase

### `POST /seo/issues/{issue_id}/resolve`
Mark an issue as resolved.

## Environment Variables

```env
SUPABASE_URL=https://supabase.grandprixrealty.agency
SUPABASE_SERVICE_KEY=your-service-key
CONTENT_PATH=/content/blog  # Path to Hugo blog content
```

## Docker Setup

The API runs in a container with the Hugo content mounted as a read-only volume:

```yaml
gpr-seo-api:
  build:
    context: ./seo-api
    dockerfile: Dockerfile
  environment:
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    - CONTENT_PATH=/content/blog
  volumes:
    - ./grandprixrealty.agency/content/blog:/content/blog:ro
```

## Database Schema

### seo.posts
```sql
CREATE TABLE seo.posts (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  url TEXT,
  title TEXT,
  description TEXT,
  categories TEXT[],
  word_count INTEGER,
  reading_time INTEGER,
  internal_links_out INTEGER,
  internal_links_in INTEGER,
  external_links INTEGER,
  overall_score INTEGER,
  title_score INTEGER,
  content_score INTEGER,
  meta_score INTEGER,
  structure_score INTEGER,
  is_draft BOOLEAN,
  has_wordpress_images BOOLEAN,
  published_at TIMESTAMPTZ,
  last_analyzed_at TIMESTAMPTZ
);
```

### seo.issues
```sql
CREATE TABLE seo.issues (
  id UUID PRIMARY KEY,
  post_slug TEXT REFERENCES seo.posts(slug),
  issue_type TEXT,
  severity TEXT,
  message TEXT,
  suggestion TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### seo.internal_links
```sql
CREATE TABLE seo.internal_links (
  id UUID PRIMARY KEY,
  source_slug TEXT,
  target_slug TEXT,
  target_url TEXT,
  anchor_text TEXT,
  created_at TIMESTAMPTZ
);
```

## Frontend

The SEO Lab frontend is a React/Vite SPA at `/seo-lab/` with:
- Protected routes (Supabase Auth)
- Dashboard with charts (Recharts)
- Post listing with filtering
- Post detail view with issue management
- Internal link graph visualization

## AI Content Optimizer

The SEO Lab includes an AI-powered content optimizer using Claude API:

### Features
- **Meta Description Generation** (Haiku) - Creates SEO-optimized meta descriptions
- **Title Optimization** (Haiku) - Improves titles for SEO and click-through rate
- **Content Humanization** (Sonnet) - Rewrites AI-generated content to sound natural
- **Internal Link Suggestions** - TF-IDF based semantic matching for link opportunities
- **Las Vegas Localization** - Automatically removes/replaces non-Las Vegas city references

### AI Endpoints
- `POST /seo/ai/build-index` - Build TF-IDF index for internal linking
- `POST /seo/ai/optimize` - Generate optimization suggestions for a post
- `POST /seo/ai/apply` - Apply approved optimizations to markdown file
- `POST /seo/ai/batch-optimize` - Batch optimize multiple posts (meta/title only)
- `GET /seo/ai/related/{slug}` - Get semantically related posts

---

## Development Roadmap

### Phase 1: Core Optimizer Fixes (Current)
| Priority | Task | Status | Description |
|----------|------|--------|-------------|
| **P0** | Hugo Rebuild Endpoint | ✅ Done | Deploy button + Hugo rebuild endpoint added |
| **P1** | View Live Button | ✅ Done | Added to results and success message |
| **P2** | Issues Page Search | ✅ Done | Text search filter for posts/issues |
| **P3** | Issues Page Pagination | ✅ Done | 50 items per page with navigation |
| **P3.5** | Database Sync on Apply | ✅ Done | Updates Supabase when changes applied (title/meta/word_count) |

### Phase 2: URL & Redirect Management
| Priority | Task | Status | Description |
|----------|------|--------|-------------|
| **P4** | 301 Redirects System | ⏳ Pending | Database table + Hugo aliases for redirects |
| **P5** | Slug/URL Optimization | ⏳ Pending | Generate clean slugs from titles + auto-create 301 redirects |

### Phase 3: Content Silos
| Priority | Task | Status | Description |
|----------|------|--------|-------------|
| **P6** | Content Silos | ⏳ Pending | Restructure URLs from `/blog/` to category silos |

#### Silo Structure (P6)
| Silo | URL Pattern | Category |
|------|-------------|----------|
| Home Buyers | `/homebuyer/{slug}/` | Home Buyer |
| Home Sellers | `/homeseller/{slug}/` | Home Seller |
| Property Management | `/propertymanagement/{slug}/` | Property Management |
| Realtors/Careers | `/realtors/{slug}/` | Realtors |
| Market Updates | `/market/{slug}/` | Market Updates |
| Mortgage | `/mortgage/{slug}/` | Mortgage |

---

## Live URL

Production: https://grandprixrealty.agency/seo-lab/

# Grand Prix Realty - Project Architecture

**Last Updated:** December 8, 2025

## Overview

Complete real estate platform for **Grand Prix Realty**, a Las Vegas brokerage. Includes:
- Marketing website (Hugo)
- AI-powered home valuation tool (AVM)
- Seller Net Sheet calculator
- MLS property search
- SEO management tools
- PDF report generation

**Live Site**: https://grandprixrealty.agency

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    grandprixrealty.agency                       │
│                    (Nginx Proxy Manager)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              gpr-website (nginx:alpine)                  │   │
│  │                     Port 8080                            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  /                  → Hugo static site                   │   │
│  │  /seller-portal/    → React seller AVM app               │   │
│  │  /buyer-search/     → React buyer search app             │   │
│  │  /seo-lab/          → React SEO management app           │   │
│  │  /api/              → proxy to gpr-avm-api               │   │
│  │  /buyer-api/        → proxy to gpr-buyer-api (/api/)     │   │
│  │  /seo-api/          → proxy to gpr-seo-api               │   │
│  │  /pdf-api/          → proxy to gpr-pdf-service           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│    ┌──────────────────────┼──────────────────────┐             │
│    │                      │                      │              │
│    ▼                      ▼                      ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  gpr-avm-api │  │ gpr-buyer-api│  │  gpr-seo-api │          │
│  │(Python/FastAPI)│ │(Node/Express)│  │(Python/FastAPI)│       │
│  │  Port 8000   │  │  Port 4000   │  │  Port 8001   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Supabase    │  │  Trestle MLS │  │  Supabase    │          │
│  │ (PostgreSQL) │  │(Cotality API)│  │ (PostgreSQL) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐                                              │
│  │gpr-pdf-service│                                             │
│  │(Node/Puppeteer)│                                            │
│  │  Port 3003   │                                              │
│  └──────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Hugo Static Site (Main Website)
**Location**: `/grandprixrealty.agency/`

Marketing landing pages:
- `/` - Homepage
- `/homebuyer/` - Buyer services landing page → links to `/buyer-search/`
- `/homeseller/` - Seller services landing page → Step 1 of seller funnel
- `/propertymanagement/` - Property management
- `/realtors/` - Careers/recruitment
- `/about/` - Company information
- `/contact/` - Contact page

**Tech**: Hugo static site generator with custom "Grand Prix" theme

### 2. Seller Portal (AVM Tool)
**Location**: `/seller-portal/`
**URL**: https://grandprixrealty.agency/seller-portal/

AI-powered seller funnel:
- **Step 1**: Address input (on `/homeseller/` Hugo page)
- **Step 2**: AVM valuation results (`/seller-portal/valuation/:id`)
  - AI-powered price estimate using LightGBM
  - Comparable sales with match scores
  - Price factors analysis
  - Confidence score and range
- **Step 3**: Seller Net Sheet (`/seller-portal/net-sheet/:id`)
  - Loan payoff calculations
  - Title & closing costs
  - Commission estimates
  - Net proceeds calculation
- **Step 4**: Listing Configuration (`/seller-portal/list/:id`)
  - Listing strategy options
  - Pricing approach selection
  - Photography & media options

**Features**:
- PDF download for AVM reports
- PDF download for Net Sheets
- Navigation flow between all steps
- "Estimated Price" wording for compliance

**Tech**: React 18 + TypeScript + Vite + TailwindCSS

### 3. Buyer Search App
**Location**: `/buyer-search-app/`
**URL**: https://grandprixrealty.agency/buyer-search/

Live MLS property search:
- Search Las Vegas listings
- Filter by price, beds, baths, property type, sqft
- Dual-range price slider
- Featured rows (luxury, new listings, price reduced)
- Property cards with MLS photos
- Interactive map view

**Tech**: React 18 + TypeScript + Vite

### 4. SEO Lab
**Location**: `/seo-frontend/`
**URL**: https://grandprixrealty.agency/seo-lab/

Comprehensive SEO management dashboard:
- **Dashboard**: Overview stats with score distributions, issue counts, word counts
- **Posts List**: All blog posts with SEO scores, filtering by category/score
- **Post Detail**: Per-post analysis with sub-scores (Title, Description, Keyword, Content, Links, Readability)
- **Issues View**: Aggregated issues across all posts with row numbers and severity levels
- **AI Fixer**: Claude-powered optimization suggestions for meta descriptions, titles, and content
- **Links Graph**: Internal linking visualization (D3.js force-directed graph)

**AI Optimization Features** (Claude API):
- Meta description generation (Haiku model)
- Title optimization (Haiku model)
- Content rewriting (Sonnet model)
- Internal link suggestions
- Batch optimization for multiple posts

**Tech**: React 19 + TypeScript + Vite + TailwindCSS + Recharts + D3.js

### 5. AVM API Backend
**Location**: `/avm-api/`

Property valuation API:
- LightGBM ML model (trained on 500K+ sales)
- Geocoding via Google Maps API
- Comparable sales matching with weighted scoring
- Bedroom match bonus (3x weight for same beds)
- $10k/bedroom price adjustment
- Value factor analysis

**Endpoints**:
- `POST /valuations` - Create new valuation
- `GET /valuations/{id}` - Get valuation by ID

**Tech**: Python 3.12 + FastAPI + LightGBM

### 6. Buyer Search API Backend
**Location**: `/buyer-search-app/server/`

MLS listings API:
- Real-time Trestle MLS integration
- OData query builder with sanitization
- Property filtering
- OAuth token management

**Endpoints**:
- `GET /api/listings` - Search listings with filters
- `GET /api/listings/:id` - Get listing by ID
- `GET /health` - Health check

**Tech**: Node.js 22 + Express + TypeScript

### 7. SEO API Backend
**Location**: `/seo-api/`

SEO management and AI optimization API:
- Blog post SEO analysis (scores for title, description, keywords, content, links, readability)
- Issue tracking with severity levels (critical, warning, info)
- Internal linking graph data
- AI-powered optimization via Claude API (Anthropic)
- Content index for semantic similarity matching
- Batch optimization support

**Endpoints**:
- `GET /seo/dashboard` - Dashboard summary stats
- `GET /seo/posts` - List posts with SEO scores
- `GET /seo/posts/{slug}` - Detailed post analysis
- `GET /seo/issues` - All issues across posts
- `GET /seo/links` - Internal links graph data
- `POST /seo/analyze` - Trigger re-analysis
- `POST /seo/ai/optimize` - AI optimization for single post
- `POST /seo/ai/batch-optimize` - Batch AI optimization
- `POST /seo/ai/apply` - Apply AI suggestions to content files
- `POST /seo/ai/build-index` - Build content embeddings index

**Tech**: Python 3.12 + FastAPI + Anthropic SDK

### 8. PDF Service
**Location**: `/pdf-service/`

PDF generation service:
- Headless Chrome via Puppeteer
- Professional dark-themed templates
- Grand Prix branding with gold accents
- Fair Housing compliance logos

**Endpoints**:
- `POST /api/pdf/net-sheet` - Generate seller net sheet PDF
- `POST /api/pdf/avm-report` - Generate AVM report PDF

**Tech**: Node.js 22 + Express + Puppeteer

## Infrastructure

### Production (Hetzner VPS)
- **Host**: 5.78.131.81
- **Proxy**: Nginx Proxy Manager (SSL via Let's Encrypt)
- **Containers**: Docker Compose

### Docker Services
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| gpr-website | nginx:alpine | 8080 | Static files + reverse proxy |
| gpr-avm-api | python:3.12-slim | 8000 | Valuation API |
| gpr-buyer-api | node:22-alpine | 4000 | MLS listings API |
| gpr-seo-api | python:3.12-slim | 8001 | SEO management API |
| gpr-pdf-service | node:22-slim | 3003 | PDF generation |

### External Services
| Service | Purpose |
|---------|---------|
| Supabase (self-hosted) | PostgreSQL database with PostGIS |
| Trestle/Cotality | MLS API (Las Vegas REALTORS) |
| Google Maps | Geocoding & Places API |
| Anthropic Claude | AI optimization for SEO (Haiku + Sonnet models) |

### CI/CD
- **Platform**: GitHub Actions
- **Workflow**: `.github/workflows/deploy.yml`
- **Trigger**: Push to `main` branch
- **Process**: Build → SSH → Pull → Rebuild → Restart

## Repository Structure

```
/grandprixrealty.agency/
├── grandprixrealty.agency/    # Hugo static site source
│   ├── content/               # Page content
│   ├── themes/grandprix/      # Custom theme
│   │   └── layouts/           # Page templates (homeseller, homebuyer, etc.)
│   └── TECH_STACK.md          # Tech stack documentation
├── seller-portal/             # React seller AVM app
│   └── src/
│       ├── pages/             # ValuationPage, SellerNetSheetPage, ListingConfigPage
│       └── types/             # TypeScript types
├── buyer-search-app/          # React buyer search app
│   ├── src/                   # Frontend
│   │   └── components/        # FilterOverlay, PropertyCard, FeaturedRows
│   └── server/                # Express API
│       └── trestleClient.ts   # MLS integration
├── seo-frontend/              # React SEO Lab app
├── seo-api/                   # Python SEO API
├── avm-api/                   # Python AVM API
│   ├── app/
│   │   └── services/          # valuation.py, geocoding.py
│   └── models/                # ML models (.pkl)
├── pdf-service/               # Node.js PDF service
│   └── src/
│       ├── index.js           # Express server
│       └── templates/         # HTML templates for PDFs
├── deploy/                    # Deployment config
│   ├── Dockerfile             # Multi-stage build
│   └── nginx.conf             # Routing config
├── docs/                      # Documentation
│   └── ROADMAP.md             # Project roadmap
├── .github/
│   └── workflows/             # GitHub Actions CI/CD
├── docker-compose.prod.yml    # Production stack
└── .env                       # Environment variables (server only)
```

## Development

### Local Development
```bash
# Hugo site (localhost:1313)
cd grandprixrealty.agency && hugo server

# Seller portal (localhost:5174)
cd seller-portal && npm run dev

# Buyer search (localhost:5173 + API on 4000)
cd buyer-search-app && npm run dev      # Frontend
cd buyer-search-app && npm run dev:api  # Backend

# AVM API (localhost:8000)
cd avm-api && uvicorn app.main:app --reload

# PDF Service (localhost:3003)
cd pdf-service && npm run dev
```

### Deployment
```bash
# Push to GitHub (triggers CI/CD)
git add -A && git commit -m "message" && git push

# Manual deployment on server
cd /root/GrandPrixRealty.Agency
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
docker network connect supabase_default gpr-avm-api
```

### Updating Environment Variables
```bash
# IMPORTANT: docker restart does NOT reload .env files!
# After editing .env, you must recreate the container:
./update-env.sh gpr-seo-api  # Recreates specific service
./update-env.sh              # Recreates all services
```

## Environment Variables

### Production (.env on server)
```
DATABASE_URL=postgresql+asyncpg://...@supabase-pooler:6543/postgres
GOOGLE_MAPS_API_KEY=...
TRESTLE_CLIENT_ID=...
TRESTLE_CLIENT_SECRET=...
TRESTLE_TOKEN_URL=https://api.cotality.com/trestle/oidc/connect/token
TRESTLE_ODATA_URL=https://api.cotality.com/trestle/odata/Property
SUPABASE_URL=http://supabase-kong:8000
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
ANTHROPIC_API_KEY=...  # For SEO AI optimization
```

## Recent Updates (December 2025)

### December 8, 2025
- **SEO Lab AI Fixer**: Added Claude-powered AI optimization for blog posts
  - Meta description generation (Haiku model - fast, cost-effective)
  - Title optimization (Haiku model)
  - Content rewriting (Sonnet model - for longer content)
  - Internal link suggestions with relevance scoring
  - Batch optimization for multiple posts
- **SEO Lab UI Improvements**:
  - Issues page now shows row numbers for easier tracking
  - External links filter added to issues
  - Fixed button visibility on AI Fixer page
- **Under Construction Mode**: Cookie-based bypass system
  - Visit any page with `?access=gpr2025` to bypass
  - Sets 30-day cookie for authorized access
- **GitHub SSH Authentication**: Configured SSH key for Hetzner deployment
  - Added github.com to known_hosts
  - Using SSH URLs for git operations
- **Environment Variable Helper**: Added `update-env.sh` script
  - Properly recreates containers when .env changes
  - `docker restart` does NOT reload env vars - must use this script

### December 5, 2025
- **PDF Service**: Added Puppeteer-based PDF generation for AVM reports and Net Sheets
- **AVM Improvements**: Bedroom match bonus (3x weight), $10k/bed adjustment
- **Compliance**: Changed "Estimated Value" to "Estimated Price"
- **Property Types**: Condo/Townhouse → "Attached", SingleFamilyResidence → "Single Family"
- **Navigation Fixes**: Fixed back navigation to preserve valuation state
- **Buyer Search**: Fixed API URL mapping, price slider state issues
- **CI/CD**: GitHub Actions deployment to Hetzner

## Upcoming Features (Planned)

### Automated Blog Post Generation
Integration of Perplexity + Claude for automated blog content creation:
- **Perplexity API**: Research trending real estate topics, gather current market data
- **Claude API**: Generate SEO-optimized blog posts from research
- **Automation Options**:
  - On-demand generation via SEO Lab UI
  - Scheduled automation (daily/weekly) via n8n or cron
  - Topic queue with priority scheduling
- **Workflow**: Research → Outline → Draft → SEO Optimization → Review → Publish

---
**GitHub**: https://github.com/federicocalder/GrandPrixRealty.Agency

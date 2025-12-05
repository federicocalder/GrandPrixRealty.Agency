# Grand Prix Realty - Tech Stack Documentation

**Last Updated:** December 5, 2025

## Overview
Complete real estate platform for Grand Prix Realty, a Las Vegas brokerage. Includes marketing website, AI-powered home valuation (AVM), seller net sheet calculator, MLS property search, SEO tools, and PDF report generation.

**Live Site:** https://grandprixrealty.agency

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (Port 8080)                       │
│                    Reverse Proxy + Static Files                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Hugo Site   │  │ Seller Portal│  │ Buyer Search │          │
│  │  (Static)    │  │   (React)    │  │   (React)    │          │
│  │     /        │  │/seller-portal│  │/buyer-search │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐                                              │
│  │   SEO Lab    │                                              │
│  │   (React)    │                                              │
│  │  /seo-lab    │                                              │
│  └──────────────┘                                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         Backend APIs                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   AVM API    │  │  Buyer API   │  │  SEO API     │          │
│  │  (FastAPI)   │  │(Node/Express)│  │  (FastAPI)   │          │
│  │    /api/     │  │ /buyer-api/  │  │  /seo-api/   │          │
│  │  Port 8000   │  │  Port 4000   │  │  Port 8001   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  PDF Service │                                              │
│  │(Node/Puppeteer)                                             │
│  │  /pdf-api/   │                                              │
│  │  Port 3003   │                                              │
│  └──────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
               ┌──────────────────────────┐
               │     External Services    │
               ├──────────────────────────┤
               │ • PostgreSQL (Supabase)  │
               │ • Google Maps API        │
               │ • Trestle MLS API        │
               └──────────────────────────┘
```

## Frontend Applications

### 1. Hugo Static Site (Marketing Website)
- **Location:** `/grandprixrealty.agency/`
- **Framework:** Hugo v0.112.0+
- **Theme:** Custom "Grand Prix" theme
- **Key Pages:**
  - Homepage (`/`)
  - Homeseller landing page (`/homeseller/`) - Entry point for seller funnel
  - Homebuyer landing page (`/homebuyer/`) - Entry point for buyer search
  - Blog (`/blog/`)
  - Contact (`/contact/`)
  - Property Management (`/propertymanagement/`)
  - Realtors/Careers (`/realtors/`)

### 2. Seller Portal (React SPA)
- **Location:** `/seller-portal/`
- **Framework:** React 18 + TypeScript + Vite
- **Routing:** React Router v6
- **Styling:** TailwindCSS + custom CSS
- **Seller Funnel Steps:**
  - **Step 1:** Address input (Hugo homeseller page)
  - **Step 2:** AVM valuation results (`/seller-portal/valuation/:id`)
  - **Step 3:** Seller Net Sheet calculator (`/seller-portal/net-sheet/:id`)
  - **Step 4:** Listing configuration (`/seller-portal/list/:id`)
- **Features:**
  - AI-powered home price estimate
  - Comparable sales with match scores
  - Price factors analysis
  - Seller net sheet with loan payoff, fees, commissions
  - Listing strategy & pricing options
  - PDF report downloads (AVM & Net Sheet)

### 3. Buyer Search App (React SPA)
- **Location:** `/buyer-search-app/`
- **Framework:** React 18 + TypeScript + Vite
- **Features:**
  - MLS property search with live filters
  - Dual-range price slider
  - Property type, beds, baths, sqft filters
  - Featured rows (Luxury, Pool Homes, Price Reduced)
  - Interactive map view
  - Property cards with MLS photos

### 4. SEO Lab (React SPA)
- **Location:** `/seo-frontend/`
- **Framework:** React 18 + TypeScript + Vite
- **Auth:** Supabase authentication (protected)
- **Features:**
  - Blog post management
  - SEO keyword tracking
  - Content optimization tools

## Backend Services

### 1. AVM API (Python/FastAPI)
- **Location:** `/avm-api/`
- **Port:** 8000
- **Proxy Path:** `/api/`
- **Features:**
  - Property valuation using LightGBM ML model
  - Comparable sales matching with weighted scoring
  - Address geocoding (Google Maps API)
  - Bedroom match bonus (3x weight for same beds)
  - $10k/bedroom price adjustment
  - PostgreSQL storage for valuations
- **Key Endpoints:**
  - `POST /valuations` - Create new valuation
  - `GET /valuations/{id}` - Get valuation by ID

### 2. Buyer Search API (Node.js/Express)
- **Location:** `/buyer-search-app/server/`
- **Port:** 4000
- **Proxy Path:** `/buyer-api/` → `/api/`
- **Features:**
  - Trestle MLS integration (Las Vegas REALTORS)
  - OData query builder with sanitization
  - Property search filters
  - OAuth token management
- **Key Endpoints:**
  - `GET /api/listings` - Search listings with filters
  - `GET /api/listings/:id` - Get listing by ID
  - `GET /health` - Health check

### 3. SEO API (Python/FastAPI)
- **Location:** `/seo-api/`
- **Port:** 8001
- **Proxy Path:** `/seo-api/`
- **Features:**
  - Blog content management
  - SEO metrics tracking
  - Supabase integration

### 4. PDF Service (Node.js/Puppeteer)
- **Location:** `/pdf-service/`
- **Port:** 3003
- **Proxy Path:** `/pdf-api/`
- **Features:**
  - Headless Chrome PDF generation
  - Professional dark-themed templates
  - Grand Prix branding with gold accents
  - Fair Housing compliance logos
- **Key Endpoints:**
  - `POST /api/pdf/net-sheet` - Generate seller net sheet PDF
  - `POST /api/pdf/avm-report` - Generate AVM report PDF
- **Templates:**
  - `/src/templates/net-sheet.html` - Seller net sheet
  - `/src/templates/avm-report.html` - Property valuation report

## Infrastructure

### Docker Deployment
- **Compose File:** `docker-compose.prod.yml`
- **Network:** `gpr-network`
- **Containers:**
  | Container | Image | Port | Purpose |
  |-----------|-------|------|---------|
  | gpr-website | nginx:alpine | 8080 | Nginx + all frontends |
  | gpr-avm-api | python:3.12-slim | 8000 | AVM Python API |
  | gpr-buyer-api | node:22-alpine | 4000 | Buyer search Node API |
  | gpr-seo-api | python:3.12-slim | 8001 | SEO Python API |
  | gpr-pdf-service | node:22-slim | 3003 | PDF generation |

### Nginx Configuration
- **File:** `/deploy/nginx.conf`
- **Features:**
  - Reverse proxy for all APIs
  - SPA routing for React apps (try_files fallback)
  - Static file caching (1 year for assets)
  - Gzip compression
  - Security headers (X-Frame-Options, X-Content-Type-Options)

### Hosting
- **Provider:** Hetzner Cloud
- **Server:** VPS with Docker
- **IP:** 5.78.131.81
- **Domain:** grandprixrealty.agency
- **SSL:** Let's Encrypt (via Nginx Proxy Manager)

### CI/CD
- **Platform:** GitHub Actions
- **Workflow:** `.github/workflows/deploy.yml`
- **Trigger:** Push to `main` branch
- **Process:**
  1. Build Docker images
  2. SSH into Hetzner server
  3. Pull latest code
  4. Rebuild containers
  5. Restart services

## External APIs & Services

### Google Maps API
- Address autocomplete (Places API)
- Geocoding (Geocoding API)
- Property location mapping

### Trestle MLS API (Cotality)
- Active listings for Las Vegas REALTORS
- Property data and photos
- Real-time market data
- OAuth2 authentication

### Supabase (Self-Hosted)
- PostgreSQL database with PostGIS
- Authentication for SEO Lab
- Row-level security
- Connection via `supabase-pooler`

## Development

### Local Development
```bash
# Hugo site (localhost:1313)
cd grandprixrealty.agency && hugo server

# Seller Portal (localhost:5174)
cd seller-portal && npm run dev

# Buyer Search (localhost:5173 + API on 4000)
cd buyer-search-app && npm run dev      # Frontend
cd buyer-search-app && npm run dev:api  # Backend

# AVM API (localhost:8000)
cd avm-api && uvicorn app.main:app --reload

# PDF Service (localhost:3003)
cd pdf-service && npm run dev
```

### Build & Deploy
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

## File Structure

```
/
├── grandprixrealty.agency/    # Hugo marketing site
│   ├── content/               # Markdown content
│   ├── themes/grandprix/      # Custom theme
│   │   └── layouts/           # Page templates
│   └── hugo.toml              # Hugo config
├── seller-portal/             # Seller React app
│   └── src/
│       ├── pages/             # Valuation, NetSheet, ListingConfig
│       └── types/             # TypeScript types
├── buyer-search-app/          # Buyer React app
│   ├── src/                   # Frontend code
│   │   └── components/        # FilterOverlay, PropertyCard, etc.
│   └── server/                # Express API
│       └── trestleClient.ts   # MLS integration
├── seo-frontend/              # SEO Lab React app
├── seo-api/                   # SEO Python API
├── avm-api/                   # AVM Python API
│   ├── app/
│   │   └── services/          # valuation.py, geocoding.py
│   └── models/                # ML models (.pkl)
├── pdf-service/               # PDF generation service
│   └── src/
│       ├── index.js           # Express server
│       └── templates/         # HTML templates
├── deploy/                    # Deployment configs
│   ├── Dockerfile             # Multi-stage Docker build
│   └── nginx.conf             # Nginx routing
├── docs/                      # Documentation
│   └── ROADMAP.md             # Project roadmap
├── .github/
│   └── workflows/             # GitHub Actions
└── docker-compose.prod.yml    # Production compose file
```

## Environment Variables

### Production (.env on server)
```
# Database
DATABASE_URL=postgresql+asyncpg://postgres:...@supabase-pooler:6543/postgres

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...

# Trestle MLS
TRESTLE_CLIENT_ID=...
TRESTLE_CLIENT_SECRET=...
TRESTLE_TOKEN_URL=https://api.cotality.com/trestle/oidc/connect/token
TRESTLE_ODATA_URL=https://api.cotality.com/trestle/odata/Property

# Supabase
SUPABASE_URL=http://supabase-kong:8000
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
```

## Performance & SEO
- CDN-delivered libraries (GSAP, Alpine.js)
- Asset fingerprinting for cache busting
- Preconnect hints for Google Fonts
- Gzip compression enabled
- Static site generation for fast loads
- Schema.org structured data
- Meta tags with OG images for social sharing

## Security
- CORS configured per service
- No secrets in client code
- Environment variables for API keys
- HTTPS everywhere (via reverse proxy)
- Input sanitization (OData injection protection)
- Numeric filter validation

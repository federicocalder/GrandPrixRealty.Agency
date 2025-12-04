# Grand Prix Realty - Tech Stack Documentation

## Overview
This document outlines the complete technology stack used in the Grand Prix Realty website and applications.

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
│  │   AVM API    │  │  SEO API     │  │  PDF Service │          │
│  │  (FastAPI)   │  │  (FastAPI)   │  │(Node/Puppeteer│          │
│  │    /api/     │  │  /seo-api/   │  │  /pdf-api/   │          │
│  │  Port 8000   │  │  Port 8001   │  │  Port 3003   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  Buyer API   │                                              │
│  │ (Node/Express│                                              │
│  │ /buyer-api/  │                                              │
│  │  Port 4000   │                                              │
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
  - Homeseller landing page (`/homeseller/`)
  - Homebuyer landing page (`/homebuyer/`)
  - Blog (`/blog/`)
  - Contact (`/contact/`)

### 2. Seller Portal (React SPA)
- **Location:** `/seller-portal/`
- **Framework:** React 18 + TypeScript + Vite
- **Routing:** React Router v6
- **Styling:** TailwindCSS + custom CSS
- **Key Features:**
  - AVM valuation display (Step 2)
  - Seller Net Sheet calculator (Step 3)
  - Listing configuration (Step 4)
  - PDF report downloads
- **Routes:**
  - `/seller-portal/valuation/:id` - AVM results
  - `/seller-portal/net-sheet/:id` - Net sheet calculator
  - `/seller-portal/list/:id` - Listing configuration

### 3. Buyer Search App (React SPA)
- **Location:** `/buyer-search-app/`
- **Framework:** React 18 + TypeScript + Vite
- **Features:**
  - MLS property search
  - Interactive map view
  - Property detail pages
  - Saved searches

### 4. SEO Lab (React SPA)
- **Location:** `/seo-frontend/`
- **Framework:** React 18 + TypeScript + Vite
- **Auth:** Supabase authentication
- **Features:**
  - Blog post management
  - SEO keyword tracking
  - Content optimization

## Backend Services

### 1. AVM API (Python/FastAPI)
- **Location:** `/avm-api/`
- **Port:** 8000
- **Proxy Path:** `/api/`
- **Features:**
  - Property valuation estimates
  - Comparable sales analysis
  - Address geocoding (Google Maps)
  - PostgreSQL storage
- **Key Endpoints:**
  - `POST /valuations` - Create new valuation
  - `GET /valuations/{id}` - Get valuation by ID

### 2. Buyer Search API (Node.js/Express)
- **Location:** `/buyer-search-app/` (backend)
- **Port:** 4000
- **Proxy Path:** `/buyer-api/`
- **Features:**
  - Trestle MLS integration
  - Property search
  - Listing data

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
  - Professional report templates
  - Seller Net Sheet PDFs
  - AVM Report PDFs
- **Key Endpoints:**
  - `POST /api/pdf/net-sheet` - Generate seller net sheet PDF
  - `POST /api/pdf/avm-report` - Generate AVM report PDF
- **Templates:**
  - `/src/templates/net-sheet.html` - Dark theme with gold accents
  - `/src/templates/avm-report.html` - Property valuation report

## Infrastructure

### Docker Deployment
- **Compose File:** `docker-compose.prod.yml`
- **Containers:**
  - `gpr-website` - Nginx + all frontends
  - `gpr-avm-api` - AVM Python API
  - `gpr-buyer-api` - Buyer search Node API
  - `gpr-seo-api` - SEO Python API
  - `gpr-pdf-service` - PDF generation service

### Nginx Configuration
- **File:** `/deploy/nginx.conf`
- **Features:**
  - Reverse proxy for all APIs
  - SPA routing for React apps
  - Static file caching
  - Gzip compression

### Hosting
- **Provider:** Hetzner Cloud
- **Server:** VPS with Docker
- **Domain:** grandprixrealty.agency
- **SSL:** Let's Encrypt (via external proxy)

## External APIs & Services

### Google Maps API
- Address autocomplete
- Geocoding
- Property location

### Trestle MLS API
- Active listings
- Property data
- Market statistics

### Supabase
- PostgreSQL database
- Authentication (SEO Lab)
- Real-time subscriptions

## Development

### Local Development
```bash
# Hugo site
cd grandprixrealty.agency && hugo server

# Seller Portal
cd seller-portal && npm run dev

# AVM API
cd avm-api && uvicorn main:app --reload

# PDF Service
cd pdf-service && npm run dev
```

### Build & Deploy
```bash
# Full deployment (via Docker Compose)
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD
- **Platform:** GitHub Actions
- **Trigger:** Push to `main` branch
- **Process:** Build Docker images → SSH deploy to Hetzner

## File Structure

```
/
├── grandprixrealty.agency/    # Hugo marketing site
│   ├── content/               # Markdown content
│   ├── themes/grandprix/      # Custom theme
│   └── hugo.toml              # Hugo config
├── seller-portal/             # Seller React app
│   └── src/pages/             # React pages
├── buyer-search-app/          # Buyer React app
├── seo-frontend/              # SEO Lab React app
├── seo-api/                   # SEO Python API
├── avm-api/                   # AVM Python API
├── pdf-service/               # PDF generation service
│   └── src/templates/         # HTML templates for PDFs
├── deploy/                    # Deployment configs
│   ├── Dockerfile             # Multi-stage Docker build
│   └── nginx.conf             # Nginx config
└── docker-compose.prod.yml    # Production compose file
```

## Performance & SEO
- CDN-delivered libraries (GSAP, Alpine.js)
- Asset fingerprinting for cache busting
- Preconnect hints for Google Fonts
- Gzip compression
- Print styles for PDF export
- Schema.org structured data

## Security
- CORS configured per service
- No secrets in client code
- Environment variables for API keys
- HTTPS everywhere (via reverse proxy)

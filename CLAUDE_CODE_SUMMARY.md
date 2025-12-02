# Grand Prix Realty - Project Architecture

## Overview

Complete real estate website for **Grand Prix Realty**, a Las Vegas brokerage. Includes marketing landing pages, an AI-powered home valuation tool, and a live MLS property search.

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
│  │  /api/              → proxy to gpr-avm-api               │   │
│  │  /buyer-api/        → proxy to gpr-buyer-api             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│         ┌─────────────────┴─────────────────┐                   │
│         ▼                                   ▼                   │
│  ┌──────────────────┐            ┌──────────────────┐          │
│  │  gpr-avm-api     │            │  gpr-buyer-api   │          │
│  │  (Python/FastAPI)│            │  (Node/Express)  │          │
│  │  Port 8000       │            │  Port 4000       │          │
│  └────────┬─────────┘            └────────┬─────────┘          │
│           │                               │                     │
│           ▼                               ▼                     │
│  ┌──────────────────┐            ┌──────────────────┐          │
│  │  Supabase        │            │  Trestle MLS     │          │
│  │  (PostgreSQL)    │            │  (Cotality API)  │          │
│  └──────────────────┘            └──────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Hugo Static Site (Main Website)
**Location**: `/grandprixrealty.agency/`

Marketing landing pages:
- `/` - Homepage
- `/homebuyer/` - Buyer services landing page
- `/homeseller/` - Seller services landing page
- `/propertymanagement/` - Property management
- `/realtors/` - Careers/recruitment
- `/about/` - Company information

**Tech**: Hugo static site generator with custom theme

### 2. Seller Portal (AVM Tool)
**Location**: `/seller-portal/`
**URL**: https://grandprixrealty.agency/seller-portal/

AI-powered home valuation tool:
- Enter property address
- Get instant ML-powered value estimate
- View comparable sales and value factors
- CTA to list property with GPR

**Tech**: React 19 + TypeScript + Vite

### 3. Buyer Search App
**Location**: `/buyer-search-app/`
**URL**: https://grandprixrealty.agency/buyer-search/

Live MLS property search:
- Search Las Vegas listings
- Filter by price, beds, baths, property type
- Featured rows (luxury, new listings, price reduced)
- Property cards with MLS photos

**Tech**: React 19 + TypeScript + Vite

### 4. AVM API Backend
**Location**: `/avm-api/`

Property valuation API:
- LightGBM ML model (trained on 500K+ sales)
- Geocoding via Google Maps API
- Comparable sales matching
- Value factor analysis

**Tech**: Python 3.12 + FastAPI + LightGBM

### 5. Buyer Search API Backend
**Location**: `/buyer-search-app/server/`

MLS listings API:
- Real-time Trestle MLS integration
- OData query builder
- Property filtering
- OAuth token management

**Tech**: Node.js + Express + TypeScript

## Infrastructure

### Production (Hetzner VPS)
- **Host**: 5.78.131.81
- **Proxy**: Nginx Proxy Manager (SSL)
- **Containers**: Docker Compose

### Docker Services
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| gpr-website | nginx:alpine | 8080 | Static files + reverse proxy |
| gpr-avm-api | python:3.12-slim | 8000 | Valuation API |
| gpr-buyer-api | node:22-alpine | 4000 | MLS listings API |

### External Services
| Service | Purpose |
|---------|---------|
| Supabase (self-hosted) | PostgreSQL database with PostGIS |
| Trestle/Cotality | MLS API (Las Vegas REALTORS) |
| Google Maps | Geocoding API |

## Repository Structure

```
/grandprixrealty.agency/
├── grandprixrealty.agency/    # Hugo static site source
│   ├── content/               # Page content
│   └── themes/grandprix/      # Custom theme
├── seller-portal/             # React seller AVM app
│   └── src/
├── buyer-search-app/          # React buyer search app
│   ├── src/                   # Frontend
│   └── server/                # Express API
├── avm-api/                   # Python FastAPI
│   ├── app/                   # Application code
│   └── models/                # ML models
├── deploy/                    # Deployment config
│   ├── Dockerfile             # Multi-stage build
│   └── nginx.conf             # Routing config
├── docker-compose.prod.yml    # Production stack
└── .env                       # Environment variables (server)
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
```

### Deployment
```bash
# Push to GitHub
git add -A && git commit -m "message" && git push origin main

# On server
cd /root/GrandPrixRealty.Agency
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
docker network connect supabase_default gpr-avm-api
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
```

---
**GitHub**: https://github.com/federicocalder/GrandPrixRealty.Agency
**Last Updated**: December 2, 2025

# Grand Prix Realty AVM App
## Comprehensive Development Plan & Technical Specification

**Version:** 1.3
**Date:** December 1, 2025
**Author:** GPR Engineering Team
**Status:** Phase 1 - ETL Tested & Ready for Full Load

---

## Table of Contents

0. [Progress Log](#0-progress-log)
1. [Executive Summary](#1-executive-summary)
2. [Business Context & Strategic Goals](#2-business-context--strategic-goals)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Feature Engineering & ML Model](#5-feature-engineering--ml-model)
6. [Database Schema Design](#6-database-schema-design)
7. [API Specification](#7-api-specification)
8. [Frontend Application](#8-frontend-application)
9. [Data Pipeline & ETL](#9-data-pipeline--etl)
10. [Security & Compliance](#10-security--compliance)
11. [SDLC & Development Phases](#11-sdlc--development-phases)
12. [MVP Definition](#12-mvp-definition)
13. [Timeline & Milestones](#13-timeline--milestones)
14. [Risk Assessment](#14-risk-assessment)
15. [Success Metrics & KPIs](#15-success-metrics--kpis)
16. [Appendices](#16-appendices)

---

## 0. Progress Log

### December 1, 2025 - Database Infrastructure Complete ✅

**Migration Status:** SUCCESS

| Schema | Table | Status |
|--------|-------|--------|
| `app` | `file_assets` | ✅ Created |
| `app` | `leads` | ✅ Created |
| `app` | `user_profiles` | ✅ Created |
| `avm` | `market_stats` | ✅ Created |
| `avm` | `model_versions` | ✅ Created |
| `avm` | `predictions` | ✅ Created |
| `avm` | `properties` | ✅ Created |
| `avm` | `sales_history` | ✅ Created |

**Indexes Created:** 26 performance indexes including:
- `idx_properties_location` - PostGIS spatial index (GIST)
- All foreign key indexes
- Query optimization indexes

**Auto-update Triggers:** Configured for `updated_at` columns

**Next Step:** ~~Build Python ETL script for Trestle historical data load~~ → Run ETL process

---

### December 1, 2025 - ETL Script Complete ✅

**Python ETL Created:** `/avm-etl/`

| File | Purpose |
|------|---------|
| `config.py` | Environment configuration loader |
| `trestle_auth.py` | OAuth2 authentication with token caching |
| `trestle_client.py` | Trestle API client with pagination |
| `database.py` | PostgreSQL bulk loader for avm schema |
| `etl_runner.py` | Main entry point with CLI options |
| `requirements.txt` | Python dependencies |

**Features:**
- Fetches closed sales (StandardStatus='Closed') from Trestle API
- Processes data month-by-month for progress tracking
- Resume capability from last checkpoint
- Rate limiting (30 req/min default)
- Bulk inserts with upsert logic
- PostGIS geography column population

**Usage:**
```bash
cd avm-etl
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python etl_runner.py --count-only   # Count records first
python etl_runner.py                 # Full load (12-24 hours)
```

**Next Step:** Run full ETL load (12-24 hours) for complete historical data

---

### December 1, 2025 - ETL Test Successful, Sales/Leases Separation Added

**Test Load:** October 2024 data - 4,562 records loaded successfully

**Key Discovery:** Trestle MLS data includes both sales AND rental leases:
- `PropertyType='Residential'` → Property **sales** (539,901 total NV since 2013)
- `PropertyType='ResidentialLease'` → Property **leases/rentals** (365,046 total NV since 2013)

**ETL Enhancement:** Added `transaction_type` tracking:
- Records now tagged with `source='trestle_sale'` or `source='trestle_lease'`
- Same database serves both Seller AVM and Landlord AVM
- Filter by `source LIKE 'trestle_sale%'` for sales comps
- Filter by `source LIKE 'trestle_lease%'` for rental comps

**Geographic Coverage:** All of Nevada (not just Clark County)
- Las Vegas, Henderson, North Las Vegas (main metro)
- Pahrump, Mesquite, Ely, Moapa Valley, etc.

**Data Volume Estimates:**
| Period | Sales | Leases | Total |
|--------|-------|--------|-------|
| 2013-2025 | ~540K | ~365K | ~905K |
| Monthly avg | ~3,800 | ~2,600 | ~6,400 |

**Ready for full load:** `python etl_runner.py` (expect 12-24 hours)

---

### December 1, 2025 - Full ETL Running + API/Frontend Scaffolded

**ETL Status:** Running on Hetzner server (background screen session)
- Loading ~905K historical records (sales + leases since 2013)
- Estimated completion: 12-24 hours
- Check progress: `ssh root@5.78.131.81` then `screen -r avm-etl`

**Application Structure Created:**

| Folder | Purpose | Status |
|--------|---------|--------|
| `/avm-api/` | FastAPI backend | ✅ Scaffolded |
| `/avm-frontend/` | React + Vite widget | ✅ Scaffolded |
| `/avm-etl/` | Python ETL scripts | ✅ Running |

**API Structure (`/avm-api/`):**
```
avm-api/
├── app/
│   ├── core/
│   │   ├── config.py          # Pydantic Settings
│   │   └── database.py        # Async SQLAlchemy + PostGIS
│   ├── models/
│   │   └── schemas.py         # Pydantic request/response models
│   ├── services/
│   │   ├── comparables.py     # PostGIS comp finder
│   │   ├── geocoding.py       # Google Maps / Nominatim
│   │   └── valuation.py       # MVP weighted-avg valuation
│   ├── routers/
│   │   ├── valuations.py      # POST /valuations, GET /valuations/{id}
│   │   └── leads.py           # POST /leads (lead capture)
│   └── main.py                # FastAPI app entry point
├── requirements.txt
├── Dockerfile
└── .env.example
```

**Frontend Structure (`/avm-frontend/`):**
```
avm-frontend/
├── src/
│   ├── components/
│   │   ├── AddressForm.tsx      # Step 1: Address input
│   │   ├── ValuationResult.tsx  # Step 2: Show estimate + comps
│   │   ├── LeadForm.tsx         # Step 3: Lead capture gate
│   │   └── AVMWidget.tsx        # Main orchestrator
│   ├── api/
│   │   └── client.ts            # Axios API client
│   ├── types/
│   │   └── valuation.ts         # TypeScript interfaces
│   ├── App.tsx
│   └── index.css                # Tailwind + GPR brand colors
├── tailwind.config.js
├── Dockerfile
└── nginx.conf
```

**Docker Configuration:**
- `docker-compose.avm.yml` - Compose file for API + Frontend
- `.env.avm.example` - Environment template

**Next Steps:**
1. Wait for ETL to complete (~12-24 hours)
2. Train LightGBM model on loaded data
3. Integrate model into valuation service
4. Test full flow locally
5. Deploy to Hetzner

---

## 1. Executive Summary

### 1.1 What is GPR AVM?

The Grand Prix Realty Automated Valuation Model (GPR AVM) is a proprietary machine learning-powered property valuation system designed to provide instant home value estimates for the Las Vegas metropolitan area.

### 1.2 Strategic Purpose

The AVM serves as the **primary lead generation gateway** for two of GPR's three business verticals:

| Vertical | Entry Point | Funnel |
|----------|-------------|--------|
| **Sellers** | Seller Landing Page → AVM | Valuation → Lead Capture → Seller Portal |
| **Landlords** | Landlord Landing Page → AVM | Valuation → Lead Capture → Landlord Portal |
| **Buyers** | Buyer Landing Page → Search App | Search → Lead Capture → Buyer Portal |

### 1.3 Core Value Proposition

- **For Users:** Instant, free property valuation with comparable sales analysis
- **For GPR:** Automated listing intake system capturing seller/landlord leads 24/7
- **Competitive Edge:** Proprietary model trained on local Vegas market data

### 1.4 Key Differentiators vs Zillow/Redfin

| Feature | Zillow Zestimate | GPR AVM |
|---------|------------------|---------|
| Accuracy | National model, less local precision | Vegas-specific training |
| Transparency | Black box | SHAP explainability ("why this price") |
| Comps | Generic | Agent-curated comparable selection |
| Lead Flow | Sold to agents | Direct to GPR agents |
| Integration | Standalone | Tied to GPR Portal ecosystem |

---

## 2. Business Context & Strategic Goals

### 2.1 The GPR Platform Ecosystem

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GRAND PRIX REALTY PLATFORM                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐          │
│    │   BUYERS     │   │   SELLERS    │   │  LANDLORDS   │          │
│    └──────┬───────┘   └──────┬───────┘   └──────┬───────┘          │
│           │                  │                  │                   │
│           ▼                  ▼                  ▼                   │
│    ┌──────────────┐   ┌─────────────────────────────┐              │
│    │ Property     │   │         GPR AVM             │              │
│    │ Search App   │   │    (Lead Generation)        │              │
│    └──────┬───────┘   └──────────────┬──────────────┘              │
│           │                          │                              │
│           ▼                          ▼                              │
│    ┌─────────────────────────────────────────────────┐             │
│    │              UNIFIED GPR PORTAL                  │             │
│    │  ┌─────────┐  ┌─────────┐  ┌─────────────┐     │             │
│    │  │ Buyer   │  │ Seller  │  │  Landlord   │     │             │
│    │  │ Portal  │  │ Portal  │  │   Portal    │     │             │
│    │  └─────────┘  └─────────┘  └─────────────┘     │             │
│    │         ONE ACCOUNT - LIFETIME CLIENT           │             │
│    └─────────────────────────────────────────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Business Goals

| Goal | Metric | Target |
|------|--------|--------|
| Lead Generation | Monthly seller leads captured | 100+ in Year 1 |
| Conversion | AVM → Listing appointment | 15-20% |
| Engagement | Time on valuation report | >3 minutes |
| Accuracy | Median error vs actual sale | <5% |
| Trust | Users who view comps | >70% |

### 2.3 Revenue Impact Model

```
Monthly Visitors to AVM:     1,000
Lead Capture Rate:           40% (gated full report)
Qualified Leads:             400
Consultation Booked:         20% → 80
Listings Signed:             25% → 20
Avg Commission @ $500K:      $15,000
Monthly Revenue Potential:   $300,000
```

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │
│   │  Hugo Website   │    │   AVM Widget    │    │   GPR Portal    │   │
│   │  (Marketing)    │    │   (React SPA)   │    │   (React SPA)   │   │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘   │
│            │                      │                      │             │
└────────────┼──────────────────────┼──────────────────────┼─────────────┘
             │                      │                      │
             ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    Nginx / Traefik                               │  │
│   │              (SSL, Rate Limiting, Load Balancing)                │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
             │                      │                      │
             ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│   │   AVM API        │   │   Portal API     │   │   Search API     │  │
│   │   (FastAPI)      │   │   (Express)      │   │   (Express)      │  │
│   │   Port 8000      │   │   Port 4000      │   │   Port 4001      │  │
│   └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘  │
│            │                      │                      │             │
│   ┌────────┴──────────────────────┴──────────────────────┴─────────┐  │
│   │                                                                 │  │
│   │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐ │  │
│   │   │ ML Service  │   │ Geocoding   │   │ Trestle Client      │ │  │
│   │   │ (LightGBM)  │   │ Service     │   │ (MLS Data)          │ │  │
│   │   └─────────────┘   └─────────────┘   └─────────────────────┘ │  │
│   │                                                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
             │                      │                      │
             ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │                    Supabase (PostgreSQL + PostGIS)                │ │
│   │                         5.78.131.81:8001                          │ │
│   ├──────────────────────────────────────────────────────────────────┤ │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │ │
│   │  │ sales    │  │ properties│  │ features │  │ valuations     │  │ │
│   │  │ history  │  │ (current) │  │ (ML)     │  │ (predictions)  │  │ │
│   │  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │ │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │ │
│   │  │ leads    │  │ users    │  │ census   │  │ model_versions │  │ │
│   │  │          │  │          │  │ data     │  │                │  │ │
│   │  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │ │
│   └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│   │  Redis Cache     │   │  S3 Storage      │   │  Model Registry  │  │
│   │  (Hot data)      │   │  (Artifacts)     │   │  (MLflow)        │  │
│   └──────────────────┘   └──────────────────┘   └──────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| AVM Widget | Address input, display results | React + Vite |
| AVM API | Valuation endpoints, lead capture | FastAPI (Python) |
| ML Service | Model inference, SHAP calculation | LightGBM + SHAP |
| Geocoding | Address → lat/long → parcel ID | Google/Nominatim |
| Trestle Client | Pull MLS data (sales, listings) | Existing TS client |
| PostGIS | Spatial queries (comps in radius) | PostgreSQL extension |
| Redis | Cache valuations, rate limiting | Redis 7 |

### 3.3 Data Flow: Valuation Request

```
┌──────────────────────────────────────────────────────────────────────┐
│                    VALUATION REQUEST FLOW                             │
└──────────────────────────────────────────────────────────────────────┘

User enters: "4521 Paradise Rd, Las Vegas, NV 89169"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ADDRESS PARSING & GEOCODING                                       │
├─────────────────────────────────────────────────────────────────────┤
│   Input: "4521 Paradise Rd, Las Vegas, NV 89169"                    │
│   Output: {                                                          │
│     lat: 36.1234,                                                    │
│     lng: -115.1234,                                                  │
│     parcel_id: "139-32-812-001",                                    │
│     normalized: "4521 PARADISE RD LAS VEGAS NV 89169"               │
│   }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. PROPERTY DATA LOOKUP                                              │
├─────────────────────────────────────────────────────────────────────┤
│   Sources:                                                           │
│   - Trestle MLS (if listed/sold)                                    │
│   - Clark County Assessor (public records)                          │
│   - Census/ACS (demographics)                                        │
│                                                                      │
│   Output: {                                                          │
│     beds: 4, baths: 2.5, sqft: 2450, lot_sf: 6500,                 │
│     year_built: 1998, pool: true, garage: 2,                        │
│     property_type: "Single Family", subdivision: "Green Valley"     │
│   }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. FEATURE ENGINEERING                                               │
├─────────────────────────────────────────────────────────────────────┤
│   Computed Features:                                                 │
│   - price_per_sqft_neighborhood (from recent sales)                 │
│   - days_since_last_sale                                            │
│   - distance_to_strip, distance_to_airport                          │
│   - school_rating_avg (within 1 mile)                               │
│   - flood_zone_risk                                                  │
│   - median_income_census_tract                                       │
│   - crime_index_zip                                                  │
│   - inventory_level_zip (supply indicator)                          │
│                                                                      │
│   Output: feature_vector[40 features]                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. MODEL INFERENCE                                                   │
├─────────────────────────────────────────────────────────────────────┤
│   Model: LightGBM (trained on 500K+ Vegas sales)                    │
│                                                                      │
│   Output: {                                                          │
│     predicted_value: 485000,                                        │
│     confidence_low: 461000,   (5th percentile)                      │
│     confidence_high: 512000,  (95th percentile)                     │
│     model_version: "gpr-avm-v1.2.0"                                 │
│   }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. EXPLAINABILITY (SHAP)                                            │
├─────────────────────────────────────────────────────────────────────┤
│   Top factors influencing this valuation:                           │
│                                                                      │
│   Feature              Impact      Direction                        │
│   ─────────────────────────────────────────                         │
│   sqft (2450)          +$45,000    ↑ Above avg for area            │
│   pool (yes)           +$22,000    ↑ Premium feature               │
│   year_built (1998)    -$15,000    ↓ Older than comps              │
│   school_rating (8.2)  +$18,000    ↑ Good schools                  │
│   lot_size (6500)      +$8,000     ↑ Larger lot                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. COMPARABLE SALES (PostGIS Query)                                  │
├─────────────────────────────────────────────────────────────────────┤
│   Query: Find 5 most similar sales within 1 mile, last 6 months     │
│                                                                      │
│   Similarity Score = f(distance, sqft_diff, bed_diff, age_diff)     │
│                                                                      │
│   Output:                                                            │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ Address              Sold      Price    Sqft   Dist  Match  │  │
│   │ 4489 Paradise Rd     10/15     $479K    2380   0.2mi  94%  │  │
│   │ 4601 Paradise Rd     09/22     $492K    2510   0.3mi  91%  │  │
│   │ 4433 Sandhill Rd     11/01     $468K    2290   0.4mi  89%  │  │
│   │ 4550 Paradise Rd     08/30     $501K    2600   0.1mi  87%  │  │
│   │ 4612 Tropicana Ave   10/08     $475K    2400   0.5mi  85%  │  │
│   └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. RESPONSE ASSEMBLY                                                 │
├─────────────────────────────────────────────────────────────────────┤
│   {                                                                  │
│     "valuation": {                                                   │
│       "estimate": 485000,                                           │
│       "range_low": 461000,                                          │
│       "range_high": 512000,                                         │
│       "confidence": 0.87                                            │
│     },                                                               │
│     "property": { ... },                                            │
│     "factors": [ ... ],   // SHAP explanations                      │
│     "comparables": [ ... ],                                         │
│     "market_trends": {                                               │
│       "zip_median_change_yoy": 0.043,                               │
│       "days_on_market_avg": 28,                                     │
│       "inventory_months": 2.1                                       │
│     },                                                               │
│     "report_id": "val_abc123",                                      │
│     "generated_at": "2025-11-30T10:30:00Z"                         │
│   }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

### 4.1 Complete Stack Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GPR AVM TECH STACK                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FRONTEND                                                           │
│  ├── React 19 + TypeScript                                         │
│  ├── Vite 7 (build tool)                                           │
│  ├── Tailwind CSS 4                                                │
│  ├── shadcn/ui (component library)                                 │
│  ├── MapLibre GL (map visualization)                               │
│  ├── Recharts (charts/graphs)                                      │
│  └── React Router 7                                                │
│                                                                     │
│  BACKEND API                                                        │
│  ├── Python 3.11+                                                  │
│  ├── FastAPI (async REST API)                                      │
│  ├── Pydantic v2 (validation)                                      │
│  ├── SQLAlchemy 2.0 (ORM)                                         │
│  ├── GeoAlchemy2 (PostGIS integration)                            │
│  └── Uvicorn (ASGI server)                                        │
│                                                                     │
│  MACHINE LEARNING                                                   │
│  ├── LightGBM 4.x (gradient boosting)                             │
│  ├── scikit-learn (preprocessing)                                  │
│  ├── SHAP (model explainability)                                   │
│  ├── pandas / numpy (data manipulation)                            │
│  ├── MLflow (experiment tracking)                                  │
│  └── joblib (model serialization)                                  │
│                                                                     │
│  DATABASE                                                           │
│  ├── PostgreSQL 15 (via Supabase)                                 │
│  ├── PostGIS 3.3 (geospatial)                                     │
│  ├── pgvector 0.8 (similarity search)                             │
│  └── Redis 7 (caching)                                            │
│                                                                     │
│  DATA PIPELINE                                                      │
│  ├── n8n (workflow orchestration)                                  │
│  ├── Python ETL scripts                                            │
│  ├── Trestle API client (MLS data)                                │
│  └── Census API (demographics)                                     │
│                                                                     │
│  INFRASTRUCTURE                                                     │
│  ├── Docker + Docker Compose                                       │
│  ├── Hetzner VPS (5.78.131.81)                                    │
│  ├── Nginx (reverse proxy)                                         │
│  ├── Let's Encrypt (SSL)                                          │
│  └── GitHub Actions (CI/CD)                                        │
│                                                                     │
│  MONITORING                                                         │
│  ├── Prometheus (metrics)                                          │
│  ├── Grafana (dashboards)                                          │
│  ├── Sentry (error tracking)                                       │
│  └── Structured logging (JSON)                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Why These Choices?

| Technology | Why | Alternatives Considered |
|------------|-----|------------------------|
| **FastAPI** | Async, auto-docs, type hints, fastest Python framework | Flask, Django REST |
| **LightGBM** | Industry standard for tabular ML, used by CCAO, fast inference | XGBoost, CatBoost |
| **PostGIS** | Native spatial queries, already installed in Supabase | MongoDB geo, Elasticsearch |
| **SHAP** | Best-in-class explainability, builds user trust | LIME, custom |
| **React** | Team familiarity, existing buyer app uses it | Vue, Svelte |
| **Redis** | Sub-ms caching, rate limiting, session storage | Memcached |

### 4.3 Python Dependencies

```txt
# requirements.txt for AVM API

# API Framework
fastapi==0.115.0
uvicorn[standard]==0.32.0
pydantic==2.9.0
python-multipart==0.0.12

# Database
sqlalchemy==2.0.35
geoalchemy2==0.15.0
asyncpg==0.30.0
psycopg2-binary==2.9.10

# ML / Data Science
lightgbm==4.5.0
scikit-learn==1.5.2
shap==0.46.0
pandas==2.2.3
numpy==2.1.3
joblib==1.4.2

# Geospatial
shapely==2.0.6
pyproj==3.7.0
geopy==2.4.1

# Caching
redis==5.2.0

# Utils
httpx==0.28.0
python-dotenv==1.0.1
orjson==3.10.11

# Monitoring
sentry-sdk[fastapi]==2.18.0
prometheus-fastapi-instrumentator==7.0.0
structlog==24.4.0

# ML Ops
mlflow==2.18.0
```

---


## 5. Feature Engineering & ML Model

### 5.1 Feature Categories

Based on CCAO research and Vegas market specifics, the model uses these feature groups:

#### 5.1.1 Property Characteristics (from Trestle MLS) [MVP]

| Feature | Type | Source | Notes |
|---------|------|--------|-------|
| `beds` | int | MLS | Bedroom count |
| `baths_full` | int | MLS | Full bathrooms |
| `baths_half` | int | MLS | Half bathrooms |
| `sqft_living` | int | MLS | Living area square feet |
| `sqft_lot` | int | MLS | Lot size |
| `year_built` | int | MLS | Construction year |
| `stories` | int | MLS | Number of floors |
| `garage_spaces` | int | MLS | Garage capacity |
| `pool` | bool | MLS | Has pool (Vegas premium) |
| `property_type` | cat | MLS | SFR/Condo/Townhouse/Multi |
| `subdivision` | cat | MLS | Neighborhood name |

#### 5.1.2 Location Features [MVP]

| Feature | Type | Source | Notes |
|---------|------|--------|-------|
| `latitude` | float | Geocoding | For spatial queries |
| `longitude` | float | Geocoding | For spatial queries |
| `zip_code` | cat | Geocoding | 89xxx codes |
| `distance_to_strip` | float | PostGIS | Miles to Las Vegas Blvd |
| `distance_to_airport` | float | PostGIS | Miles to LAS/HND |

#### 5.1.3 Market Context Features [MVP]

| Feature | Type | Source | Notes |
|---------|------|--------|-------|
| `median_price_zip_6mo` | float | Computed | Rolling median in zip |
| `price_per_sqft_zip` | float | Computed | $/sqft benchmark |
| `days_on_market_zip` | float | Computed | Avg DOM in area |
| `inventory_months_zip` | float | Computed | Supply indicator |

#### 5.1.4 Census Demographics [Phase 2]

| Feature | Type | Source | Notes |
|---------|------|--------|-------|
| `median_income_tract` | float | ACS5 | Household income |
| `pct_owner_occupied` | float | ACS5 | Ownership rate |
| `median_age_tract` | float | ACS5 | Population age |
| `pct_bachelor_degree` | float | ACS5 | Education level |

#### 5.1.5 Proximity Features [Phase 2]

| Feature | Type | Source | Notes |
|---------|------|--------|-------|
| `nearest_school_dist_ft` | float | PostGIS | Distance to school |
| `school_rating_1mi` | float | GreatSchools | Avg rating nearby |
| `nearest_park_dist_ft` | float | OSM | Green space access |
| `flood_zone` | cat | FEMA | Risk category |

### 5.2 Model Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GPR AVM MODEL ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Algorithm: LightGBM (Gradient Boosted Decision Trees)          │
│  Objective: regression (RMSE minimization)                      │
│  Target: sale_price (log-transformed for training)              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              HYPERPARAMETERS (Initial)                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  num_iterations:     1000-1500                          │   │
│  │  learning_rate:      0.01-0.02                          │   │
│  │  num_leaves:         127-255                            │   │
│  │  max_depth:          -1 (unlimited)                     │   │
│  │  min_data_in_leaf:   20-50                              │   │
│  │  feature_fraction:   0.6-0.8                            │   │
│  │  bagging_fraction:   0.8                                │   │
│  │  bagging_freq:       5                                  │   │
│  │  lambda_l1:          0.01-0.1                           │   │
│  │  lambda_l2:          0.01-0.2                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Training Strategy:                                             │
│  ├── 10-fold cross-validation                                  │
│  ├── Time-based split (train on older, validate on recent)     │
│  ├── Early stopping (50 rounds without improvement)            │
│  └── Hyperparameter tuning via Optuna (Phase 2)                │
│                                                                 │
│  Output:                                                        │
│  ├── Point estimate (predicted sale price)                     │
│  ├── Confidence interval (quantile regression or bootstrap)    │
│  └── SHAP values (feature importance per prediction)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Model Lifecycle & Versioning

#### Phase Breakdown

| Phase | What | How |
|-------|------|-----|
| **MVP** | Train v1.0, deploy, measure | Manual training script, joblib file in Docker volume |
| **Phase 2** | Add versioning table, track metrics | `model_versions` table, manual retraining |
| **Phase 3** | Automated retraining triggers | n8n workflow, threshold-based triggers |

#### MVP Model Versioning (Simple)

```
/app/models/
├── gpr-avm-v1.0.0.joblib      # Current production model
├── gpr-avm-v1.0.0-meta.json   # Training metadata
└── training-logs/
    └── v1.0.0-training.log
```

**Meta file structure:**
```json
{
  "version": "1.0.0",
  "trained_at": "2025-12-15T10:30:00Z",
  "training_samples": 45000,
  "features_used": 25,
  "metrics": {
    "rmse": 42500,
    "mape": 0.058,
    "median_error_pct": 0.041
  },
  "notes": "Initial Vegas metro model, 2020-2025 sales data"
}
```

#### Phase 2+: Database Versioning

```sql
-- model_versions table (add when needed)
CREATE TABLE avm.model_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    trained_at TIMESTAMPTZ NOT NULL,
    training_samples INT,
    feature_count INT,
    metrics JSONB,
    artifact_path TEXT,  -- 'models/gpr-avm-v1.1.0.joblib'
    is_production BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 Retraining Policy [Phase 3]

**Triggers (when to retrain):**
1. **Time-based:** Every 2-3 months minimum
2. **Data-based:** 5,000+ new closed sales since last training
3. **Performance-based:** 60-day rolling MAPE exceeds 8%

**Process:**
1. n8n workflow checks triggers weekly
2. If triggered, calls `POST /ml/train` endpoint
3. New model trained, metrics computed
4. Human reviews and approves deployment
5. Previous model retained for rollback

---

## 6. Database Schema Design

### 6.1 Architecture Decision: Schemas vs Separate Databases

**Recommendation: Single Database, Multiple Schemas**

```
┌─────────────────────────────────────────────────────────────────┐
│           SUPABASE POSTGRES (5.78.131.81:8001)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  SCHEMA: avm    │  │  SCHEMA: app    │  │ SCHEMA: public  │ │
│  │  (ML/Valuation) │  │  (User-facing)  │  │ (Supabase Auth) │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤ │
│  │ • properties    │  │ • users         │  │ • auth.users    │ │
│  │ • sales_history │  │ • leads         │  │ • auth.sessions │ │
│  │ • features      │  │ • saved_searches│  │                 │ │
│  │ • predictions   │  │ • favorites     │  │                 │ │
│  │ • market_stats  │  │ • portal_prefs  │  │                 │ │
│  │ • model_versions│  │ • messages      │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  Access Control:                                                │
│  • avm schema: Backend services ONLY (FastAPI, ETL)            │
│  • app schema: Backend + Supabase client (with RLS)            │
│  • public: Supabase auth system                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why NOT two separate databases:**
| Concern | Two DBs | One DB + Schemas |
|---------|---------|------------------|
| Ops complexity | 2x backups, 2x connections | Single backup, one pool |
| Cross-domain queries | Requires FDW or API calls | Native JOINs work |
| Transaction safety | Distributed transactions | ACID within one DB |
| Supabase integration | Manual wiring | Built-in auth works |

### 6.2 Schema: `avm` (Core Valuation Data)

#### 6.2.1 properties [MVP]

```sql
CREATE SCHEMA IF NOT EXISTS avm;

CREATE TABLE avm.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identifiers
    parcel_id VARCHAR(50) UNIQUE,           -- Clark County APN
    mls_listing_key VARCHAR(50),            -- Trestle ListingKey
    address_full TEXT NOT NULL,
    address_normalized TEXT,                 -- Uppercase, standardized
    
    -- Location (PostGIS)
    location GEOGRAPHY(POINT, 4326),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    zip_code VARCHAR(10),
    city VARCHAR(100),
    subdivision VARCHAR(200),
    
    -- Property Characteristics
    property_type VARCHAR(50),              -- 'Single Family', 'Condo', etc.
    beds SMALLINT,
    baths_full SMALLINT,
    baths_half SMALLINT,
    sqft_living INT,
    sqft_lot INT,
    year_built SMALLINT,
    stories SMALLINT,
    garage_spaces SMALLINT,
    pool BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    source VARCHAR(50),                     -- 'trestle', 'county', 'manual'
    source_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_properties_location ON avm.properties USING GIST(location);
CREATE INDEX idx_properties_zip ON avm.properties(zip_code);
CREATE INDEX idx_properties_parcel ON avm.properties(parcel_id);
CREATE INDEX idx_properties_type ON avm.properties(property_type);
```

#### 6.2.2 sales_history [MVP]

```sql
CREATE TABLE avm.sales_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES avm.properties(id),
    
    -- Sale Details
    sale_price NUMERIC(12, 2) NOT NULL,
    sale_date DATE NOT NULL,
    close_date DATE,
    
    -- MLS Data
    mls_listing_key VARCHAR(50),
    mls_status VARCHAR(50),                 -- 'Closed', 'Sold', etc.
    days_on_market INT,
    list_price NUMERIC(12, 2),
    
    -- Snapshot of property at sale time
    beds_at_sale SMALLINT,
    baths_at_sale NUMERIC(3,1),
    sqft_at_sale INT,
    
    -- Flags
    is_arms_length BOOLEAN DEFAULT TRUE,    -- Exclude foreclosures, family sales
    is_outlier BOOLEAN DEFAULT FALSE,       -- Statistical outlier flag
    
    -- Metadata
    source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for comp queries
CREATE INDEX idx_sales_property ON avm.sales_history(property_id);
CREATE INDEX idx_sales_date ON avm.sales_history(sale_date DESC);
CREATE INDEX idx_sales_price ON avm.sales_history(sale_price);
```

#### 6.2.3 predictions [MVP]

```sql
CREATE TABLE avm.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What was valued
    property_id UUID REFERENCES avm.properties(id),
    address_input TEXT,                     -- Original user input
    
    -- Prediction Results
    predicted_value NUMERIC(12, 2) NOT NULL,
    confidence_low NUMERIC(12, 2),          -- 5th percentile
    confidence_high NUMERIC(12, 2),         -- 95th percentile
    confidence_score NUMERIC(4, 3),         -- 0.000 to 1.000
    
    -- Model Info
    model_version VARCHAR(20) NOT NULL,
    feature_vector JSONB,                   -- Input features used
    shap_values JSONB,                      -- Top N SHAP explanations
    
    -- Comparable Sales Used
    comparable_ids UUID[],                  -- Array of sales_history IDs
    
    -- Request Context
    request_source VARCHAR(50),             -- 'widget', 'api', 'batch'
    session_id VARCHAR(100),
    ip_address INET,
    
    -- Accuracy Tracking (filled later when sale happens)
    actual_sale_price NUMERIC(12, 2),
    actual_sale_date DATE,
    error_amount NUMERIC(12, 2),
    error_percent NUMERIC(6, 4),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_predictions_property ON avm.predictions(property_id);
CREATE INDEX idx_predictions_created ON avm.predictions(created_at DESC);
CREATE INDEX idx_predictions_model ON avm.predictions(model_version);
```

#### 6.2.4 market_stats [Phase 2]

```sql
CREATE TABLE avm.market_stats (
    id SERIAL PRIMARY KEY,
    
    -- Geography
    geo_type VARCHAR(20) NOT NULL,          -- 'zip', 'tract', 'city'
    geo_code VARCHAR(20) NOT NULL,
    
    -- Time Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Statistics
    median_price NUMERIC(12, 2),
    avg_price NUMERIC(12, 2),
    price_per_sqft NUMERIC(8, 2),
    total_sales INT,
    avg_days_on_market NUMERIC(6, 1),
    inventory_months NUMERIC(4, 2),
    price_change_yoy NUMERIC(6, 4),         -- Year-over-year % change
    
    -- Metadata
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(geo_type, geo_code, period_start)
);
```

### 6.3 Schema: `app` (User & Portal Data)

#### 6.3.1 leads [MVP]

```sql
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contact Info
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Lead Source
    source VARCHAR(50) NOT NULL,            -- 'avm', 'buyer_search', 'manual'
    source_url TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    
    -- Lead Type
    lead_type VARCHAR(50),                  -- 'seller', 'buyer', 'landlord'
    
    -- Property Interest (for AVM leads)
    property_address TEXT,
    valuation_id UUID,                      -- FK to avm.predictions
    estimated_value NUMERIC(12, 2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'new',       -- 'new', 'contacted', 'qualified', 'converted', 'lost'
    assigned_agent_id UUID,
    
    -- Conversion
    converted_at TIMESTAMPTZ,
    user_id UUID,                           -- If they create account
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_email ON app.leads(email);
CREATE INDEX idx_leads_status ON app.leads(status);
CREATE INDEX idx_leads_type ON app.leads(lead_type);
CREATE INDEX idx_leads_created ON app.leads(created_at DESC);
```

#### 6.3.2 user_profiles [MVP]

```sql
-- Extends Supabase auth.users with app-specific data
CREATE TABLE app.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    
    -- Portal Access
    is_buyer BOOLEAN DEFAULT FALSE,
    is_seller BOOLEAN DEFAULT FALSE,
    is_landlord BOOLEAN DEFAULT FALSE,
    is_agent BOOLEAN DEFAULT FALSE,
    
    -- Preferences
    preferred_contact VARCHAR(20),          -- 'email', 'phone', 'text'
    notification_prefs JSONB DEFAULT '{}',
    
    -- Metadata
    lead_id UUID REFERENCES app.leads(id),  -- Original lead if converted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.4 File Storage Strategy

#### MVP: Use Supabase Storage (Built-in)

```
Supabase Storage Buckets:
────────────────────────────────────────────────
gpr-avm-reports/
├── valuations/
│   ├── val_abc123.pdf
│   └── val_def456.pdf
└── ...

gpr-portal-files/  (Phase 2)
├── documents/
│   ├── user_123/
│   │   ├── purchase_agreement.pdf
│   │   └── inspection_report.pdf
└── ...
```

**Why Supabase Storage for MVP:**
- Already included with your Supabase instance
- No new infrastructure to deploy
- Built-in access control via RLS
- CDN-ready signed URLs

**Phase 2+: Consider S3/MinIO only if:**
- Storage exceeds 50GB
- Need lifecycle policies (auto-delete old files)
- Multi-region redundancy required

#### File Reference Pattern

```sql
-- Simple file tracking (MVP)
CREATE TABLE app.file_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    owner_type VARCHAR(50) NOT NULL,        -- 'valuation', 'document', 'avatar'
    owner_id UUID NOT NULL,
    
    -- File Info
    bucket VARCHAR(100) NOT NULL,
    path TEXT NOT NULL,                     -- 'valuations/val_abc123.pdf'
    filename VARCHAR(255),
    content_type VARCHAR(100),
    size_bytes BIGINT,
    
    -- Access
    is_public BOOLEAN DEFAULT FALSE,
    public_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. API Specification

### 7.1 AVM API Endpoints (FastAPI)

Base URL: `https://api.grandprix.re/avm/v1`

#### 7.1.1 Core Valuation [MVP]

```yaml
POST /valuations
  description: Get instant property valuation
  request_body:
    address: string (required) - "4521 Paradise Rd, Las Vegas, NV 89169"
    include_comps: boolean (default: true)
    include_shap: boolean (default: true)
  response:
    valuation:
      id: "val_abc123"
      estimate: 485000
      range_low: 461000
      range_high: 512000
      confidence: 0.87
    property:
      beds: 4
      baths: 2.5
      sqft: 2450
      year_built: 1998
      ...
    factors:  # Top 5 SHAP values
      - feature: "sqft_living"
        impact: 45000
        direction: "positive"
        explanation: "Above average for neighborhood"
      ...
    comparables:
      - address: "4489 Paradise Rd"
        sale_date: "2025-10-15"
        sale_price: 479000
        sqft: 2380
        distance_mi: 0.2
        match_score: 0.94
      ...
    market_trends:
      zip_median_price: 472000
      price_change_yoy: 0.043
      days_on_market_avg: 28
      inventory_months: 2.1
    generated_at: "2025-11-30T10:30:00Z"
  rate_limit: 100/hour per IP (unauthenticated), 1000/hour (authenticated)
```

```yaml
GET /valuations/{valuation_id}
  description: Retrieve a previous valuation
  response: Same as POST response
  
GET /valuations/{valuation_id}/report
  description: Get PDF report (gated - requires lead capture)
  response: 
    content_type: application/pdf
    or
    error: "lead_capture_required"
    lead_form_url: "/leads/capture?valuation_id=val_abc123"
```

#### 7.1.2 Lead Capture [MVP]

```yaml
POST /leads
  description: Capture lead before releasing full report
  request_body:
    valuation_id: string (required)
    email: string (required)
    phone: string (optional)
    first_name: string (optional)
    lead_type: "seller" | "landlord" | "curious"
    property_timeline: "now" | "3_months" | "6_months" | "just_curious"
  response:
    lead_id: "lead_xyz789"
    report_url: "/valuations/val_abc123/report?token=..."
    message: "Your report is ready!"
```

#### 7.1.3 Comparables [MVP]

```yaml
GET /properties/{property_id}/comparables
  description: Get comparable sales for a property
  query_params:
    radius_miles: float (default: 1.0, max: 5.0)
    months_back: int (default: 6, max: 24)
    limit: int (default: 5, max: 20)
    min_similarity: float (default: 0.7)
  response:
    comparables: [...]
    search_criteria:
      center_lat: 36.1234
      center_lng: -115.1234
      radius_miles: 1.0
      date_range: "2025-05-30 to 2025-11-30"
```

#### 7.1.4 Market Data [Phase 2]

```yaml
GET /market/stats
  description: Get market statistics
  query_params:
    zip_code: string
    geo_type: "zip" | "tract" | "city"
  response:
    stats:
      median_price: 472000
      avg_price: 489000
      price_per_sqft: 245
      total_sales_6mo: 342
      days_on_market: 28
      inventory_months: 2.1
      price_change_yoy: 0.043
    trends:
      - month: "2025-06"
        median_price: 458000
      ...
```

### 7.2 Authentication Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    API AUTHENTICATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PUBLIC ENDPOINTS (rate limited by IP):                         │
│  ├── POST /valuations          - Get instant valuation          │
│  ├── POST /leads               - Submit lead form               │
│  └── GET /market/stats         - Public market data             │
│                                                                 │
│  AUTHENTICATED ENDPOINTS (via Supabase JWT):                    │
│  ├── GET /valuations           - User's valuation history       │
│  ├── GET /valuations/{id}/report - Download PDF                │
│  └── GET /saved/*              - Saved searches, favorites      │
│                                                                 │
│  INTERNAL ENDPOINTS (API key + IP whitelist):                   │
│  ├── POST /etl/*               - ETL triggers from n8n          │
│  ├── POST /ml/*                - Model management               │
│  └── GET /admin/*              - Admin dashboards               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Frontend Application

### 8.1 AVM Widget Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AVM WIDGET (React SPA)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Deployment: Embedded in Hugo site OR standalone subdomain      │
│  URL: grandprix.re/home-value OR avm.grandprix.re               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    USER FLOW                             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  [1] ADDRESS INPUT                                      │   │
│  │      ┌─────────────────────────────────────────────┐   │   │
│  │      │ 🏠 Enter your property address              │   │   │
│  │      │ ┌─────────────────────────────────────────┐ │   │   │
│  │      │ │ 4521 Paradise Rd, Las Vegas, NV      ▼│ │   │   │
│  │      │ └─────────────────────────────────────────┘ │   │   │
│  │      │           [ Get My Home Value ]             │   │   │
│  │      └─────────────────────────────────────────────┘   │   │
│  │                          │                              │   │
│  │                          ▼                              │   │
│  │  [2] INSTANT ESTIMATE (The Hook)                        │   │
│  │      ┌─────────────────────────────────────────────┐   │   │
│  │      │  Your Home Value Estimate                   │   │   │
│  │      │  ┌─────────────────────────────────────┐   │   │   │
│  │      │  │         $485,000                    │   │   │   │
│  │      │  │    $461K ──────●────── $512K        │   │   │   │
│  │      │  └─────────────────────────────────────┘   │   │   │
│  │      │                                             │   │   │
│  │      │  ⚡ See what's driving your home value     │   │   │
│  │      │  📊 View comparable sales in your area     │   │   │
│  │      │  📄 Get detailed PDF report                │   │   │
│  │      │                                             │   │   │
│  │      │  [ Get Full Report → ] (gated)             │   │   │
│  │      └─────────────────────────────────────────────┘   │   │
│  │                          │                              │   │
│  │                          ▼                              │   │
│  │  [3] LEAD CAPTURE GATE                                  │   │
│  │      ┌─────────────────────────────────────────────┐   │   │
│  │      │  Get Your Free Home Value Report            │   │   │
│  │      │                                             │   │   │
│  │      │  Email*    [________________]               │   │   │
│  │      │  Phone     [________________]               │   │   │
│  │      │                                             │   │   │
│  │      │  Are you thinking of selling?               │   │   │
│  │      │  ○ Yes, in the next 3 months               │   │   │
│  │      │  ○ Maybe in 6-12 months                    │   │   │
│  │      │  ○ Just curious about my value             │   │   │
│  │      │                                             │   │   │
│  │      │     [ Send My Report ]                      │   │   │
│  │      └─────────────────────────────────────────────┘   │   │
│  │                          │                              │   │
│  │                          ▼                              │   │
│  │  [4] FULL REPORT                                        │   │
│  │      ┌─────────────────────────────────────────────┐   │   │
│  │      │  📊 SHAP Factor Chart                       │   │   │
│  │      │  🗺️  Map with Comparables                   │   │   │
│  │      │  📋 Comp Details Table                      │   │   │
│  │      │  📈 Market Trends                           │   │   │
│  │      │                                             │   │   │
│  │      │  [ Download PDF ] [ Schedule Consultation ]│   │   │
│  │      └─────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Component Structure

```
src/
├── components/
│   ├── AddressInput/
│   │   ├── AddressInput.tsx        # Autocomplete input
│   │   ├── AddressSuggestions.tsx  # Dropdown suggestions
│   │   └── index.ts
│   │
│   ├── ValuationDisplay/
│   │   ├── EstimateCard.tsx        # Big number + range
│   │   ├── ConfidenceGauge.tsx     # Visual confidence
│   │   └── index.ts
│   │
│   ├── FactorChart/
│   │   ├── ShapWaterfall.tsx       # SHAP visualization
│   │   ├── FactorList.tsx          # Text explanations
│   │   └── index.ts
│   │
│   ├── ComparablesMap/
│   │   ├── MapView.tsx             # MapLibre GL map
│   │   ├── CompMarker.tsx          # Property markers
│   │   ├── CompCard.tsx            # Hover/click details
│   │   └── index.ts
│   │
│   ├── ComparablesTable/
│   │   ├── CompTable.tsx           # Data grid
│   │   ├── CompRow.tsx             # Individual row
│   │   └── index.ts
│   │
│   ├── LeadCapture/
│   │   ├── LeadForm.tsx            # Email/phone form
│   │   ├── TimelineSelector.tsx    # Selling timeline
│   │   └── index.ts
│   │
│   └── MarketTrends/
│       ├── TrendChart.tsx          # Line chart
│       ├── StatsCards.tsx          # Key metrics
│       └── index.ts
│
├── pages/
│   ├── HomePage.tsx                # Address input landing
│   ├── ResultsPage.tsx             # Full report view
│   └── NotFoundPage.tsx
│
├── hooks/
│   ├── useValuation.ts             # API call + state
│   ├── useComparables.ts           # Comp fetching
│   ├── useLeadCapture.ts           # Form submission
│   └── useAddressAutocomplete.ts   # Address suggestions
│
├── services/
│   ├── api.ts                      # Axios instance
│   ├── valuationService.ts         # /valuations endpoints
│   └── leadService.ts              # /leads endpoints
│
└── types/
    ├── valuation.ts                # Valuation response types
    ├── property.ts                 # Property types
    └── lead.ts                     # Lead form types
```

---

## 9. Data Pipeline & ETL

### 9.1 Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PIPELINE ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   SOURCES    │    │     ETL      │    │   TARGETS    │      │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤      │
│  │              │    │              │    │              │      │
│  │ Trestle MLS ─┼───►│  Python     ─┼───►│ avm.properties│     │
│  │ (sales)      │    │  Scripts     │    │ avm.sales     │     │
│  │              │    │              │    │              │      │
│  │ Trestle MLS ─┼───►│  Scheduled  ─┼───►│ avm.market_   │     │
│  │ (listings)   │    │  via n8n     │    │     stats     │     │
│  │              │    │              │    │              │      │
│  │ Census API ──┼───►│  Triggered  ─┼───►│ avm.features  │     │
│  │ (ACS5)       │    │  or manual   │    │              │      │
│  │              │    │              │    │              │      │
│  │ Clark County─┼───►│             ─┼───►│              │      │
│  │ (assessor)   │    │              │    │              │      │
│  │              │    │              │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
│  Orchestration: n8n (scheduling, retries, alerts)               │
│  Processing: Python scripts (heavy lifting)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 n8n Workflow Catalog

#### MVP Workflows

**Flow 1: Nightly Trestle Sales Sync**
```
Trigger: Cron @ 02:00 daily
Steps:
1. HTTP Request → POST /etl/trestle/sales-sync
2. Python service:
   - Calls Trestle API for closed sales (last 7 days)
   - Upserts into avm.sales_history
   - Updates avm.properties with latest data
3. On success: Log to monitoring
4. On failure: Send Telegram/email alert
```

**Flow 2: Weekly Feature Refresh**
```
Trigger: Cron @ Sunday 03:00
Steps:
1. HTTP Request → POST /etl/features/rebuild
2. Python service:
   - Computes zip-level market stats
   - Updates neighborhood medians
   - Recalculates proximity features
3. Log completion metrics
```

**Flow 3: Prediction Accuracy Tracking**
```
Trigger: Cron @ daily 04:00
Steps:
1. HTTP Request → POST /etl/predictions/link-actuals
2. Python service:
   - Finds predictions where property has now sold
   - Joins actual_sale_price into avm.predictions
   - Computes error metrics
3. If error rate spikes: Alert team
```

#### Phase 2 Workflows

**Flow 4: Conditional Model Retraining**
```
Trigger: Cron @ weekly + conditional
Steps:
1. GET /ml/health-check
   - New sales count since last training
   - 60-day rolling MAPE
2. If triggers met:
   - POST /ml/train (async job)
   - Wait for completion webhook
   - Register new model version
   - Notify for human approval
```

**Flow 5: Weekly Performance Digest**
```
Trigger: Cron @ Monday 09:00
Steps:
1. GET /admin/metrics/weekly
2. Format report (valuations, leads, errors)
3. Send to Slack/email
```

### 9.3 ETL Endpoint Spec

```python
# app/routers/etl.py

@router.post("/trestle/sales-sync")
async def sync_trestle_sales(
    days_back: int = 7,
    background_tasks: BackgroundTasks
):
    """
    Sync recent closed sales from Trestle MLS.
    Called by n8n nightly workflow.
    """
    background_tasks.add_task(
        run_trestle_sync, 
        days_back=days_back
    )
    return {"status": "started", "days_back": days_back}

@router.post("/features/rebuild")
async def rebuild_features(
    zip_codes: list[str] = None,  # None = all
    background_tasks: BackgroundTasks
):
    """
    Recompute market features and property features.
    Called by n8n weekly workflow.
    """
    background_tasks.add_task(
        run_feature_rebuild,
        zip_codes=zip_codes
    )
    return {"status": "started"}

@router.post("/predictions/link-actuals")
async def link_prediction_actuals():
    """
    Find predictions where property has since sold.
    Update with actual price and compute error.
    """
    result = await link_actuals_to_predictions()
    return {
        "predictions_updated": result.count,
        "avg_error_pct": result.avg_error
    }
```

---

## 10. Security & Compliance

### 10.1 Security Measures

| Layer | Measure | Implementation |
|-------|---------|----------------|
| **Transport** | TLS 1.3 | Let's Encrypt via Nginx |
| **API** | Rate limiting | 100/hr IP (public), 1000/hr (auth) |
| **Auth** | JWT tokens | Supabase Auth |
| **Data** | Row Level Security | Supabase RLS policies |
| **Secrets** | Environment vars | Docker secrets / .env |
| **Logging** | No PII in logs | Structured logging, masked fields |

### 10.2 Compliance Considerations

| Regulation | Applies? | Handling |
|------------|----------|----------|
| **CCPA** | Yes (CA residents) | Disclosure in privacy policy, deletion on request |
| **MLS Data Rules** | Yes | No caching photos beyond license terms, proper attribution |
| **Fair Housing** | Yes | Model audited for bias by protected classes |
| **GDPR** | Maybe (EU visitors) | Consent banner, data export/delete |

### 10.3 Rate Limiting Strategy

```python
# Rate limit tiers
RATE_LIMITS = {
    "public": {
        "valuations": "100/hour",      # Per IP
        "leads": "20/hour",             # Per IP
    },
    "authenticated": {
        "valuations": "1000/hour",      # Per user
        "reports": "100/hour",          # Per user
    },
    "internal": {
        "etl": "unlimited",             # API key + IP whitelist
    }
}
```

---

## 11. SDLC & Development Phases

### 11.1 Development Methodology

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT APPROACH                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Methodology: Iterative with defined phases                     │
│  Sprint Length: 2 weeks                                         │
│  Reviews: End of each phase                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    PHASE STRUCTURE                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  PHASE 1 (MVP)                                          │   │
│  │  └── Foundation: DB, API skeleton, basic model          │   │
│  │                                                         │   │
│  │  PHASE 2                                                │   │
│  │  └── Enhancement: Better features, n8n pipelines        │   │
│  │                                                         │   │
│  │  PHASE 3                                                │   │
│  │  └── Scale: Automation, monitoring, optimization        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Testing:                                                       │
│  ├── Unit tests: pytest (backend), vitest (frontend)           │
│  ├── Integration: API endpoint tests                           │
│  ├── Model validation: Holdout set metrics                     │
│  └── Manual QA: Before each phase release                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Phase Breakdown

#### Phase 1: MVP Foundation (6-8 weeks)

```
Week 1-2: Infrastructure & Data
├── [x] Supabase schemas created (avm, app)
├── [x] Tables: properties, sales_history, predictions, leads ✅ Dec 1, 2025
├── [x] Tables: user_profiles, file_assets, market_stats, model_versions ✅ Dec 1, 2025
├── [x] Trestle ETL script created ✅ Dec 1, 2025 (see /avm-etl/)
├── [ ] Seed data: Run ETL to load 500K+ Vegas closed sales (2013-present)
└── [x] PostGIS spatial indexes verified (26 indexes created) ✅ Dec 1, 2025

Week 3-4: ML Model v1.0
├── [ ] Feature engineering script
├── [ ] LightGBM training pipeline
├── [ ] Cross-validation + metrics logging
├── [ ] SHAP integration
├── [ ] Model artifact saved (joblib)
└── [ ] Basic comparable finder (PostGIS query)

Week 5-6: FastAPI Backend
├── [ ] Project scaffolding (FastAPI + uvicorn)
├── [ ] POST /valuations endpoint
├── [ ] GET /valuations/{id} endpoint  
├── [ ] POST /leads endpoint
├── [ ] Rate limiting middleware
└── [ ] Docker containerization

Week 7-8: React Frontend
├── [ ] Vite + React + TypeScript setup
├── [ ] Address input with autocomplete
├── [ ] Valuation display component
├── [ ] SHAP factor visualization
├── [ ] Comparables map (MapLibre)
├── [ ] Lead capture form
└── [ ] Integration testing
```

#### Phase 2: Enhancement (4-6 weeks)

```
├── n8n workflow setup (nightly sync, feature refresh)
├── Census demographic features
├── PDF report generation
├── Market trends endpoint
├── model_versions table + tracking
├── Admin dashboard (basic metrics)
└── Performance optimization (Redis caching)
```

#### Phase 3: Scale & Automate (4-6 weeks)

```
├── Automated retraining pipeline
├── A/B testing infrastructure
├── Error alerting (MAPE spikes)
├── Full monitoring (Prometheus + Grafana)
├── Load testing + optimization
└── Documentation + handoff
```

---

## 12. MVP Definition

### 12.1 MVP Scope (Must Have)

```
┌─────────────────────────────────────────────────────────────────┐
│                         MVP CHECKLIST                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ MUST HAVE FOR LAUNCH                                        │
│  ═══════════════════════════════════════════════════════        │
│                                                                 │
│  User Flow:                                                     │
│  ☐ User enters Las Vegas address                               │
│  ☐ Instant valuation displayed (<3 sec)                        │
│  ☐ Price range shown (confidence interval)                     │
│  ☐ Lead form gate before full report                           │
│  ☐ Lead captured to database                                   │
│  ☐ Full report with SHAP factors                               │
│  ☐ 5 comparable sales shown on map                             │
│                                                                 │
│  Technical:                                                     │
│  ☐ LightGBM model trained on Vegas sales                       │
│  ☐ MAPE < 8% on holdout set                                    │
│  ☐ API responds in < 2 seconds                                 │
│  ☐ Works on mobile + desktop                                   │
│  ☐ Rate limiting prevents abuse                                │
│  ☐ Deployed on Hetzner (Docker)                                │
│                                                                 │
│  Data:                                                          │
│  ☐ 12+ months of closed sales loaded                           │
│  ☐ Property characteristics from Trestle                       │
│  ☐ Basic location features (lat/lng, zip)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 NOT in MVP (Phase 2+)

```
❌ PDF report download (Phase 2)
❌ Automated nightly sync (Phase 2 - manual is fine)
❌ Census demographics features (Phase 2)
❌ Market trends charts (Phase 2)
❌ Model versioning table (Phase 2)
❌ Automated retraining (Phase 3)
❌ A/B testing (Phase 3)
❌ Admin dashboard (Phase 2)
❌ Redis caching (Phase 2 - Postgres can handle MVP load)
```

### 12.3 MVP Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Model accuracy | MAPE < 8% | Holdout test set |
| API latency | p95 < 2 seconds | Logging |
| Lead capture rate | > 30% of valuations | Database query |
| Uptime | > 99% | Monitoring |
| Mobile usability | Score > 80 | Lighthouse |

---

## 13. Timeline & Milestones

### 13.1 High-Level Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROJECT TIMELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2025                                                           │
│  ════                                                           │
│                                                                 │
│  December                                                       │
│  ├── Week 1-2: Planning complete, schemas deployed             │
│  └── Week 3-4: Trestle data loaded, feature engineering        │
│                                                                 │
│  2026                                                           │
│  ════                                                           │
│                                                                 │
│  January                                                        │
│  ├── Week 1-2: Model v1.0 trained + validated                  │
│  └── Week 3-4: FastAPI backend complete                        │
│                                                                 │
│  February                                                       │
│  ├── Week 1-2: React frontend complete                         │
│  ├── Week 3: Integration testing                               │
│  └── Week 4: 🚀 MVP LAUNCH                                     │
│                                                                 │
│  March-April                                                    │
│  └── Phase 2: n8n pipelines, PDF reports, market trends        │
│                                                                 │
│  May-June                                                       │
│  └── Phase 3: Automation, monitoring, optimization             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 Key Milestones

| Milestone | Target Date | Deliverable |
|-----------|-------------|-------------|
| M1: Data Ready | Dec 15, 2025 | Schemas deployed, 50K+ sales loaded |
| M2: Model v1.0 | Jan 15, 2026 | Trained model, MAPE < 8% |
| M3: API Complete | Jan 31, 2026 | All MVP endpoints working |
| M4: Frontend Complete | Feb 15, 2026 | Full user flow functional |
| M5: MVP Launch | Feb 28, 2026 | Live on grandprix.re |
| M6: Phase 2 Complete | Apr 30, 2026 | Automated pipelines, PDF reports |

---

## 14. Risk Assessment

### 14.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Model accuracy below target** | Medium | High | Start with simpler model, iterate. Use holdout testing early. |
| **Trestle API rate limits** | Low | Medium | Implement caching, batch requests, respect limits |
| **Data quality issues** | Medium | Medium | Data validation in ETL, outlier detection |
| **Scope creep** | High | Medium | Strict MVP definition, phase gates |
| **Performance issues at scale** | Low | Medium | Load test before launch, Redis cache ready |
| **Lead capture UX friction** | Medium | High | A/B test gate timing, optimize form |

### 14.2 Contingency Plans

**If model accuracy is poor:**
1. Add more features (census, proximity)
2. Segment model by property type
3. Ensemble with XGBoost
4. Increase training data window

**If Trestle sync fails:**
1. Alert via n8n → Telegram
2. Retry with exponential backoff
3. Manual intervention for extended outages
4. Cache last known data, show "as of" date

---

## 15. Success Metrics & KPIs

### 15.1 Technical KPIs

| KPI | Target | Measurement |
|-----|--------|-------------|
| Model MAPE | < 8% | Weekly on new sales |
| API p95 latency | < 2s | Prometheus |
| Uptime | > 99.5% | UptimeRobot |
| Error rate | < 1% | Sentry |

### 15.2 Business KPIs

| KPI | Target | Measurement |
|-----|--------|-------------|
| Monthly valuations | 500+ by month 3 | Database count |
| Lead capture rate | > 35% | Leads / Valuations |
| Qualified leads | 50+ / month | CRM tracking |
| Listing conversions | 5+ / month | CRM tracking |

### 15.3 User Experience KPIs

| KPI | Target | Measurement |
|-----|--------|-------------|
| Time to first estimate | < 3 seconds | Analytics |
| Full report view rate | > 50% | Analytics |
| Mobile usability | > 80 Lighthouse | Lighthouse CI |
| Bounce rate | < 40% | Analytics |

---

## 16. Appendices

### Appendix A: Environment Variables

```bash
# .env.example for AVM API

# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@5.78.131.81:5432/postgres
SUPABASE_URL=http://5.78.131.81:8001
SUPABASE_SERVICE_KEY=your-service-key

# Trestle MLS
TRESTLE_CLIENT_ID=your-client-id
TRESTLE_CLIENT_SECRET=your-client-secret
TRESTLE_API_URL=https://api-prod.corelogic.com/trestle

# Geocoding
GOOGLE_MAPS_API_KEY=your-key  # Or use Nominatim

# Redis (Phase 2)
REDIS_URL=redis://localhost:6379

# API Settings
API_RATE_LIMIT_PUBLIC=100
API_RATE_LIMIT_AUTH=1000
CORS_ORIGINS=https://grandprix.re,https://avm.grandprix.re

# Model
MODEL_PATH=/app/models/gpr-avm-v1.0.0.joblib

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Appendix B: Docker Compose (MVP)

```yaml
# docker-compose.avm.yml

version: '3.8'

services:
  avm-api:
    build:
      context: ./avm-api
      dockerfile: Dockerfile
    container_name: gpr-avm-api
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - TRESTLE_CLIENT_ID=${TRESTLE_CLIENT_ID}
      - TRESTLE_CLIENT_SECRET=${TRESTLE_CLIENT_SECRET}
      - MODEL_PATH=/app/models/current.joblib
    volumes:
      - ./models:/app/models:ro
    restart: unless-stopped
    networks:
      - gpr-network

  avm-frontend:
    build:
      context: ./avm-frontend
      dockerfile: Dockerfile
    container_name: gpr-avm-frontend
    ports:
      - "3000:80"
    restart: unless-stopped
    networks:
      - gpr-network

networks:
  gpr-network:
    external: true
```

### Appendix C: References

1. **CCAO Model Repository**: https://github.com/ccao-data/model-res-avm
2. **LightGBM Documentation**: https://lightgbm.readthedocs.io/
3. **SHAP Documentation**: https://shap.readthedocs.io/
4. **Trestle API Documentation**: (Internal/Licensed)
5. **PostGIS Documentation**: https://postgis.net/documentation/
6. **FastAPI Documentation**: https://fastapi.tiangolo.com/

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-30 | GPR Engineering | Initial draft |
| 1.1 | 2025-12-01 | GPR Engineering | Database migration complete - all 8 tables + 26 indexes created |
| 1.2 | 2025-12-01 | GPR Engineering | Python ETL script created in /avm-etl/ |
| 1.3 | 2025-12-01 | GPR Engineering | ETL tested (Oct 2024), sales/leases separation added |
| 1.4 | 2025-12-01 | GPR Engineering | Full ETL running on Hetzner, API + Frontend scaffolded |

---

*End of Document*

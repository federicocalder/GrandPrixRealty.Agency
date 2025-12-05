# Grand Prix Realty - Project Roadmap

Last updated: 2025-12-05

## Brand Experience Goals
- Modern & minimal like Airbnb
- Emotional & cinematic like Apple
- Functional like MLS
- Trust-based like a private concierge
- Social like Instagram

## Success Metrics
- Buyer engagement rate
- Saved properties per user
- Time spent searching
- Conversion to prequal
- Comments & interactions per home

---

## PHASE 1 — Core Search Engine (Foundation) ✅

- [x] Connect Trestle API to search engine
- [x] Live filters working (price, beds, baths, type, etc.)
- [x] Map + listing grid sync
- [x] Featured property rows (Featured, Pool Homes, High Rise, Price Reduced)
- [x] Premium filter UI with dual-range price slider
- [x] Reset/Restart search button
- [x] View All button per featured row
- [x] Price reduced endpoint with discount badges
- [x] Fix price slider state management issues
- [x] Fix API URL mapping for production
- [ ] Finalize UI style (fonts, color system, branding tone)
- [ ] Optimize mobile layout
- [ ] Property cards clickable → link to listing page

---

## PHASE 2 — Seller Portal & AVM (Complete) ✅

- [x] Create SEO-ready homeseller landing page (Hugo)
- [x] Address input with Google Places autocomplete
- [x] Unit number field for condos/townhomes
- [x] AI-powered home valuation (LightGBM model)
- [x] Comparable sales display with match scores
- [x] Value factors analysis
- [x] Confidence score and price range
- [x] Seller Net Sheet calculator (Step 3)
- [x] Listing configuration page (Step 4)
- [x] PDF report generation (Puppeteer service)
- [x] Download PDF for AVM reports
- [x] Download PDF for Net Sheet
- [x] Navigation flow between all steps
- [x] "Estimated Price" wording for compliance
- [x] Property type formatting (Attached, Single Family)
- [x] AVM weighting improvements (bedroom match bonus, $10k adjustment)

---

## PHASE 3 — Listing Pages System

- [x] Create SEO-ready Dynamic Listing Page Template (Hugo static)
- [x] Add IDX attribution compliance block
- [x] Add photo gallery + fullscreen view (Ken Burns, parallax, lightbox)
- [x] Add property specs panels
- [ ] Add PITI mortgage calculator
- [x] Add neighborhood & lifestyle section (schools)
- [x] Add map embed
- [x] Contact CTA (Schedule Showing / Contact Form)
- [ ] Add AI-powered listing enhancement layer (future C1 integration)

### Information Hierarchy (Buyer-First)
1. **Primary**: Hero gallery, Price, Address, Beds/Baths/SqFt/Year, Description, HOA, Taxes, DOM
2. **Secondary**: Property Details (features, appliances, lot size, garage, construction)
3. **Tertiary**: PITI Calculator (mortgage estimate breakdown)
4. **Quaternary**: Map, Neighborhood, Schools
5. **Footer**: IDX compliance, broker attribution

### SEO Strategy
- URL: `/homes/[city]/[address-slug]-[ListingId]`
- Structured data: RealEstateListing, Place, Offer schemas
- Meta tags with OG images for social sharing
- Static generation for fast loads + crawlability

---

## PHASE 4 — Buyer Portal MVP

- [ ] User authentication (Supabase Auth)
- [ ] Save properties (favorites)
- [ ] Collections / folders
- [ ] Notes per property
- [ ] Share with others (link + DM)
- [ ] Basic activity tracking

---

## PHASE 5 — Social Layer

- [ ] Commenting on homes
- [ ] Reactions system (love / pass / considering)
- [ ] Tagging realtors, lenders, family
- [ ] Feed view (new, trending, popular homes)
- [ ] Share to WhatsApp / SMS / socials

---

## PHASE 6 — Mortgage Integration

- [ ] Soft credit pull system
- [ ] Pre-qual flow embedded in portal
- [ ] Progress tracker (stage system)
- [ ] Document upload center
- [ ] AI mortgage assistant

---

## PHASE 7 — AI Experience Layer

- [ ] AI Search Interface (Claude SDK)
- [ ] Conversational search prompts
- [ ] AI guide for buyer journey
- [ ] Smart listing recommendations
- [ ] Controlled prompt guardrails & rules

---

## PHASE 8 — Pro Marketplace

- [ ] Pro account tier
- [ ] Featured post system
- [ ] Verified badges
- [ ] Sponsored listings
- [ ] Analytics dashboard for pros
- [ ] Lead & exposure monetization

---

## System Infrastructure ✅

- [x] Hetzner Server
- [x] Supabase Database (PostgreSQL + PostGIS)
- [x] Trestle MLS Feed (Las Vegas REALTORS)
- [x] Hugo Main Website
- [x] React Seller Portal App (Vite)
- [x] React Buyer Search App (Vite)
- [x] React SEO Lab App (Vite)
- [x] AVM API (Python/FastAPI)
- [x] Buyer Search API (Node/Express)
- [x] SEO API (Python/FastAPI)
- [x] PDF Service (Node/Puppeteer)
- [x] GitHub Actions CI/CD pipeline
- [x] Docker Compose deployment
- [ ] Logging & performance monitoring

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Main Website | Hugo (static) |
| Seller Portal | React 18 + Vite + TypeScript |
| Buyer Search App | React 18 + Vite + TypeScript |
| SEO Lab | React 18 + Vite + TypeScript |
| AVM API | Python 3.12 + FastAPI + LightGBM |
| Buyer API | Node.js 22 + Express + TypeScript |
| SEO API | Python 3.12 + FastAPI |
| PDF Service | Node.js 22 + Express + Puppeteer |
| MLS Data | Trestle API (RESO/OData) |
| Database | PostgreSQL (Supabase self-hosted) |
| Auth | Supabase Auth |
| Maps | Google Maps API |
| Hosting | Hetzner VPS + Docker |
| CI/CD | GitHub Actions |
| Future AI | Claude SDK |

---

## Security & Robustness

- [x] OData injection protection (sanitize city/state inputs)
- [x] Numeric filter validation (prevent NaN)
- [x] Proper TypeScript types
- [x] Frontend error handling
- [x] CORS configured per service
- [x] Environment variables for secrets
- [ ] Rate limiting middleware (protect Trestle quota: 7,200/hr)
- [ ] Environment validation at startup

---

## Technical Debt

- [ ] Add unit tests for trestleClient functions
- [ ] Add integration tests for API endpoints
- [ ] Add React component tests
- [ ] Document API endpoints (OpenAPI/Swagger)

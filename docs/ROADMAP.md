# Grand Prix Realty - Project Roadmap

Last updated: 2025-11-27

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

## PHASE 1 — Core Search Engine (Foundation)

- [x] Connect Trestle API to search engine
- [x] Live filters working (price, beds, baths, type, etc.)
- [x] Map + listing grid sync
- [x] Featured property rows (Featured, Pool Homes, High Rise, Price Reduced)
- [x] Premium filter UI with dual-range price slider
- [x] Reset/Restart search button
- [x] View All button per featured row
- [x] Price reduced endpoint with discount badges
- [ ] Finalize UI style (fonts, color system, branding tone)
- [ ] Optimize mobile layout
- [ ] Property cards clickable → link to listing page

---

## PHASE 2 — Listing Pages System

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

### Photo Gallery Features
- Ken Burns effect (subtle slow zoom/pan)
- Smooth crossfade auto-rotate (5-6 seconds)
- Parallax scroll on hero
- Fullscreen lightbox with swipe navigation

---

## PHASE 3 — Buyer Portal MVP

- [ ] User authentication (Supabase Auth)
- [ ] Save properties (favorites)
- [ ] Collections / folders
- [ ] Notes per property
- [ ] Share with others (link + DM)
- [ ] Basic activity tracking

---

## PHASE 4 — Social Layer

- [ ] Commenting on homes
- [ ] Reactions system (love / pass / considering)
- [ ] Tagging realtors, lenders, family
- [ ] Feed view (new, trending, popular homes)
- [ ] Share to WhatsApp / SMS / socials

---

## PHASE 5 — Mortgage Integration

- [ ] Soft credit pull system
- [ ] Pre-qual flow embedded in portal
- [ ] Progress tracker (stage system)
- [ ] Document upload center
- [ ] AI mortgage assistant

---

## PHASE 6 — AI Experience Layer

- [ ] AI Search Interface (C1 SDK)
- [ ] Conversational search prompts
- [ ] AI guide for buyer journey
- [ ] Smart listing recommendations
- [ ] Controlled prompt guardrails & rules

---

## PHASE 7 — Pro Marketplace

- [ ] Pro account tier
- [ ] Featured post system
- [ ] Verified badges
- [ ] Sponsored listings
- [ ] Analytics dashboard for pros
- [ ] Lead & exposure monetization

---

## System Infrastructure

- [x] Hetzner Server
- [x] Supabase Database
- [x] Trestle MLS Feed
- [x] Hugo Main Website
- [x] React Buyer Search App (Vite)
- [ ] Deployment pipeline (Git → Hetzner)
- [ ] Logging & performance monitoring

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Main Website | Hugo (static) |
| Buyer Search App | React 19 + Vite + TypeScript |
| Listing Pages | Hugo (static, SEO-optimized) |
| API Proxy | Express 5 (Node.js) |
| MLS Data | Trestle API (RESO/OData) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Hetzner |
| Future AI | Claude C1 SDK |

---

## Security & Robustness

- [x] OData injection protection (sanitize city/state inputs)
- [x] Numeric filter validation (prevent NaN)
- [x] Proper TypeScript types
- [x] Frontend error handling
- [ ] CORS tightening for production
- [ ] Rate limiting middleware (protect Trestle quota: 7,200/hr)
- [ ] Environment validation at startup

---

## Technical Debt

- [ ] Add unit tests for trestleClient functions
- [ ] Add integration tests for API endpoints
- [ ] Add React component tests
- [ ] Document API endpoints (OpenAPI/Swagger)

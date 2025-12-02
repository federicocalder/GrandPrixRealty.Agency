# Grand Prix Realty - Complete Project Structure

## 🚨 IMPORTANT: Project Architecture

This is a **LOCAL DEVELOPMENT PROJECT** with TWO separate applications:

### 1. Hugo Static Site (Main Website)
**Location**: `/Users/federicocalderon/grandprixrealty.agency/grandprixrealty.agency/`
- **Dev Server**: `http://localhost:1313`
- **Command**: `hugo server`
- **Purpose**: Main company website with blog, property management, about, careers pages
- **Navigation**: Uses relative paths (e.g., `/about/`, `/propertymanagement/`)

### 2. React Buyer Search App (Standalone)
**Location**: `/Users/federicocalderon/grandprixrealty.agency/buyer-search-app/`
- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend API**: `http://localhost:4000` (Express server)
- **Command**: `npm run dev` (frontend), `npm run dev:api` (backend)
- **Purpose**: Property search tool for homebuyers
- **Navigation**: Should use relative paths to link to Hugo pages

## ⚠️ Critical Navigation Rules

**DO NOT use external URLs** like `https://grandprixrealty.agency/` in navigation!
**DO NOT use localhost URLs** like `http://localhost:1313/` - these will fail!

**Use RELATIVE paths that match the Hugo site structure:**
```javascript
// In buyer-search-app/src/components/Navbar.tsx (same as Hugo header.html)
<a href="/">Home/Logo</a>                    // Homepage
<a href="/homebuyer/">Buy</a>                // Buyer landing page
<a href="/homeseller/">Sell</a>              // Seller page
<a href="/propertymanagement/">Manage</a>    // Property management
<a href="/about/">About Us</a>               // About page
<a href="/careers/">Careers</a>              // Careers page
```

This matches the Hugo site header at:
`/grandprixrealty.agency/themes/grandprix/layouts/partials/header.html`

## 🎯 Project Overview
React-based property search application for Grand Prix Realty's homebuyer landing page, running as standalone app during development. Connects to Trestle MLS API for Las Vegas REALTORS data and uses self-hosted Supabase for data storage.

## ✅ Environment Setup Complete
- **Environment File**: `buyer-search-app/.env` - ✅ Configured with all API keys
- **Trestle MLS API**: ✅ Tested and authenticated  
- **Supabase Database**: ✅ Running on Hetzner server
- **Development Stack**: ✅ Ready (Vite + React + TypeScript + Tailwind)

## 🔑 Key Configuration Details

### Trestle MLS API (Las Vegas REALTORS)
- **Status**: ✅ Active and tested
- **Base URL**: `https://api.cotality.com/trestle/odata`
- **Feed Type**: IDX Plus WebAPI
- **Data Source**: Las Vegas REALTORS (GLVAR)
- **Quota**: 7,200 queries/hour, 180/minute

### Supabase Database (Hetzner Server)
- **Status**: ✅ Running and configured
- **URL**: `http://5.78.131.81:8001`
- **PostGIS**: ✅ Available for geospatial queries
- **Tables**: ✅ Already created

### Tech Stack
- **Frontend**: React 19.2.0 + TypeScript + Vite
- **Styling**: Tailwind CSS 4.1.17
- **Mapping**: MapLibre GL JS 5.12.0
- **Icons**: Lucide React 0.553.0
- **Database**: Supabase (self-hosted)
- **API**: Trestle MLS WebAPI

## 🎯 Next Development Steps

### Immediate Tasks
1. **Activate Supabase Client** - Uncomment and configure the Supabase client in `src/lib/supabaseClient.ts`
2. **Implement Trestle API Service** - Create service for property data fetching
3. **Build Property Search UI** - Implement search forms and filters
4. **Add Map Integration** - Configure MapLibre for property locations
5. **Create Property Cards** - Display search results with images and details
6. **Implement User Favorites** - Connect to Supabase for saved properties

### Key Features to Build
- Property search with filters (price, beds, baths, location)
- Interactive map with property markers
- Property detail modals with photo galleries
- User favorites and saved searches
- Contact forms for property inquiries
- Responsive design for mobile/desktop

### Integration Points
- **Hugo Site**: Embed React app in homebuyer landing page
- **Contact System**: Connect to Grand Prix Realty contact forms
- **Lead Generation**: Capture buyer information and preferences

## 📁 Project Structure
```
buyer-search-app/
├── .env                    # ✅ Environment configuration
├── src/
│   ├── components/         # React components
│   ├── lib/               # API services and utilities
│   ├── types/             # TypeScript definitions
│   └── data/              # Static data/constants
└── package.json           # Dependencies configured
```

## 🚀 Development Commands
```bash
cd /Users/federicocalderon/grandprixrealty.agency/buyer-search-app
npm run dev     # Start development server
npm run build   # Build for production
npm run lint    # Run ESLint
```

---
**Status**: 🟢 Ready for Claude Code development
**Last Updated**: November 13, 2025

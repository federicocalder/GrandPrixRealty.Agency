# Grand Prix Realty - Tech Stack Documentation

## Overview
This document outlines the complete technology stack used in the Grand Prix Realty website.

## Core Framework

### Hugo Static Site Generator
- **Version:** 0.112.0+ (minimum)
- **Theme:** Custom "Grand Prix" theme
- **Location:** `/themes/grandprix/`
- **Config:** `hugo.toml`

## Frontend Technologies

### CSS Framework

#### TailwindCSS
- **Version:** Latest (via CDN)
- **Delivery:** CDN (`https://cdn.tailwindcss.com`)
- **Configuration:** Inline config in `baseof.html`
- **Custom Colors:**
  - `grand-blue`: `#1e40af`
  - `grand-gold`: `#f59e0b`
  - `grand-gray`: `#6b7280`
- **Custom Fonts:**
  - Sans: Inter
  - Display: Poppins

#### Custom CSS
- **Location:** `/themes/grandprix/assets/css/main.css`
- **Features:**
  - Hero gradients
  - Custom animations (fadeInUp, spin)
  - Hover effects (hover-lift)
  - Prose/content styling
  - Responsive utilities
  - Loading spinners

### JavaScript Libraries

#### GSAP (GreenSock Animation Platform)
- **Version:** 3.12.2
- **Delivery:** CDN (cdnjs.cloudflare.com)
- **Plugins Used:**
  - GSAP Core (`gsap.min.js`)
  - ScrollTrigger (`ScrollTrigger.min.js`)
  - TextPlugin (`TextPlugin.min.js`)
- **Usage:**
  - Page load animations
  - Scroll-triggered animations
  - Smooth scrolling for anchor links
  - Element transitions

#### Alpine.js
- **Version:** 3.x
- **Delivery:** CDN (cdn.jsdelivr.net)
- **Usage:**
  - Interactive components
  - Mobile menu toggling
  - Dynamic UI elements

#### Custom JavaScript
- **Location:** `/themes/grandprix/assets/js/main.js`
- **Features:**
  - Smooth scrolling initialization
  - Animation initialization
  - Mobile menu functionality
  - Contact form handling (prepared)
  - Utility functions (debounce, viewport detection)

### Typography

#### Google Fonts
- **Fonts Used:**
  - **Inter** (300, 400, 500, 600, 700) - Body text
  - **Poppins** (300, 400, 500, 600, 700, 800) - Headings/Display
- **Delivery:** Google Fonts CDN
- **Preconnect:** Enabled for performance

## SEO & Analytics

### Meta Tags
- Open Graph (Facebook)
- Twitter Cards
- Schema.org structured data (RealEstateAgent)
- Standard SEO meta tags

### Structured Data
- **Type:** RealEstateAgent
- **Location:** Inline JSON-LD in `baseof.html`

## Accessibility Features
- Skip to content links
- Semantic HTML5 structure
- ARIA labels where needed
- Keyboard navigation support

## Build & Deployment

### Hugo Build
- **Build Stats:** Enabled (`writeStats = true`)
- **Output:** `/public/` directory
- **Goldmark:** Unsafe HTML enabled for flexibility

### Asset Processing
- CSS/JS minification via Hugo Pipes
- Fingerprinting for cache busting
- Resource bundling

## File Structure

```
grandprixrealty.agency/
├── archetypes/          # Content templates
├── assets/              # (empty - using theme assets)
├── content/             # Site content (pages, blog posts)
├── data/                # Data files
├── layouts/             # (empty - using theme layouts)
├── static/              # Static files (images, favicon, etc.)
├── themes/
│   └── grandprix/       # Custom theme
│       ├── assets/
│       │   ├── css/
│       │   │   └── main.css
│       │   └── js/
│       │       └── main.js
│       └── layouts/
│           ├── _default/
│           │   ├── baseof.html
│           │   └── single.html
│           ├── partials/
│           │   ├── header.html
│           │   └── footer.html
│           └── index.html
├── hugo.toml            # Site configuration
└── hugo_stats.json      # Build statistics
```

## Performance Optimizations
- CDN-delivered libraries
- Minified CSS/JS
- Asset fingerprinting
- Preconnect hints for fonts
- Lazy loading ready

## Future Considerations

### Planned Features
- IDX integration for property search
- MLS data feeds
- Property detail pages
- Advanced search/filtering
- Map integrations (Google Maps/Mapbox)
- Multi-agent site architecture

### Potential Tech Additions
- Build process (npm/Vite) for local Tailwind
- CMS integration (Netlify CMS, Forestry, etc.)
- Form handling service (Netlify Forms, Formspree)
- Analytics (Google Analytics, Plausible)
- Performance monitoring

## Notes
- All external dependencies loaded via CDN (no local node_modules)
- No build process required for JS/CSS beyond Hugo
- Simple deployment to any static hosting (Netlify, Vercel, GitHub Pages)
- Git repository located at: `grandprixrealty.agency/.git`

# Multi-stage build for GPR Website
# Combines Hugo static site + React seller-portal + buyer-search-app

# Stage 1: Build Hugo site
FROM hugomods/hugo:exts AS hugo-builder
WORKDIR /src
COPY grandprixrealty.agency/ .
RUN hugo --minify

# Stage 2: Build React seller-portal
FROM node:22-alpine AS seller-builder
WORKDIR /app
COPY seller-portal/package*.json ./
RUN npm ci
COPY seller-portal/ .
RUN npm run build

# Stage 3: Build React buyer-search-app
FROM node:22-alpine AS buyer-builder
WORKDIR /app
COPY buyer-search-app/package*.json ./
RUN npm ci
COPY buyer-search-app/ .
RUN npm run build

# Stage 4: Production nginx
FROM nginx:alpine
LABEL maintainer="Grand Prix Realty"

# Copy nginx config
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Copy Hugo build
COPY --from=hugo-builder /src/public /usr/share/nginx/html

# Copy React seller-portal build
COPY --from=seller-builder /app/dist /usr/share/nginx/html/seller-portal

# Copy React buyer-search-app build
COPY --from=buyer-builder /app/dist /usr/share/nginx/html/buyer-search

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

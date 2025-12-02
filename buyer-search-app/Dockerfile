# GPR Buyer Search API Dockerfile
# Node.js Express server for Trestle MLS API integration
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server/ ./server/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:4000/health || exit 1

# Run with tsx (TypeScript executor)
CMD ["npx", "tsx", "server/index.ts"]

# ==============================================================================
# MEDIFLOW LIS — MULTI-STAGE PRODUCTION DOCKERFILE
# ==============================================================================

# Stage 1: Build Frontend Single Page Application
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend TypeScript Server
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 3: Minimal Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY backend/src/db/schema.sql ./dist/db/schema.sql

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./public

# Create directory for uploads and local database
RUN mkdir -p /app/uploads /app/data && chown -R node:node /app

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "dist/server.js"]

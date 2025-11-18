# Multi-stage build: backend only (API). Frontends are built in their own images.
FROM node:22-alpine AS builder
WORKDIR /app

# Backend deps
COPY backend/package.json ./backend/
RUN cd backend && npm install --production=false

# Copy backend sources
COPY backend ./backend

# Build backend (NestJS -> tsc)
RUN cd backend && npm run build

# Runtime image
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install only backend production deps
COPY backend/package.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy backend dist only (frontends are built in their own images)
COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 3000
CMD ["node", "backend/dist/main.js"]

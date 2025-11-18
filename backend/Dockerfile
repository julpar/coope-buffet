## Monorepo-aware Dockerfile for backend (API)
## Moved here from repo root to live alongside the backend service
FROM node:22-alpine AS builder
WORKDIR /repo

# 1) Install workspace deps at the root for better caching (uses npm workspaces)
COPY package.json package-lock.json* turbo.json ./
COPY backend/package.json backend/package.json
RUN npm install

# 2) Copy backend sources only and build
COPY backend ./backend
RUN npm run build -w backend

# --- Runtime image (minimal) ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install only backend production deps (no need for full workspace deps in runtime)
COPY backend/package.json ./backend/package.json
RUN cd backend && npm install --omit=dev

# Copy compiled backend dist from builder
COPY --from=builder /repo/backend/dist ./backend/dist

EXPOSE 3000
CMD ["node", "backend/dist/main.js"]

Buffet Fast-Food Platform – Initial Skeleton

This repository contains an initial, deployable skeleton for the Buffet platform as specified:
- NestJS backend (API only in production)
- Two Vue 3 (Vite) frontends: customer and staff (served by dedicated Nginx containers in production)
- Redis as the only data store
- Docker & docker-compose ready for Coolify deployment

This is a minimal foundation to verify the end-to-end build, containerization, and static serving structure. Business logic (stock control, orders, MercadoPago, roles, QR, dashboards, Socket.io, etc.) will be implemented incrementally on top of this base.

Project Layout
- backend/ → NestJS app (API + middleware; no static serving in prod)
- app-customer/ → Customer-facing Vue app (minimal placeholder + soft-offline overlay)
- app-staff/ → Staff dashboard Vue app (minimal placeholder)
- Dockerfile → Multi-stage build for backend only (port 3000)
- app-customer/Dockerfile → Builds customer SPA and serves via Nginx
- app-staff/Dockerfile → Builds staff SPA and serves via Nginx
- docker-compose.yml → Redis + backend + two Nginx static servers

Environment Variables
- REDIS_URL: Redis connection string (default in compose: redis://redis:6379)
- MERCADOPAGO_ACCESS_TOKEN: MercadoPago token (placeholder for future integration)
- BASE_URL: Optional base URL (Coolify can inject)
- PORT: Optional (default 3000)

Local Development (without Docker)
Backend:
1. cd backend
2. npm install
3. npm run dev (requires a Redis instance at REDIS_URL, default: redis://localhost:6379)

Frontends:
- Customer: cd app-customer && npm install && npm run dev
- Staff: cd app-staff && npm install && npm run dev

Note: In production, the two SPAs are served by dedicated Nginx containers; the backend only exposes the API. During local dev, you can run them separately via Vite dev servers.

Build & Run with Docker (recommended)
1. docker compose build
2. docker compose up -d
3. Open the SPAs:
   - Customer: http://localhost:8080
   - Staff:    http://localhost:8081
4. APIs (proxied by Nginx under /api):
   - http://localhost:8080/api/health
   - http://localhost:8080/api/platform/status

Redis data persists in the named volume "redis-data".

Coolify Deployment Checklist
- Push repo with docker-compose.yml + Dockerfile
- In Coolify → New Resource → Docker Compose → select repo
- Coolify auto-detects compose → click Deploy
- Set environment variables in Coolify UI:
  - MERCADOPAGO_ACCESS_TOKEN (your MP token)
  - BASE_URL = https://yourdomain.com (optional but recommended)
- (Optional) Add custom domain + enable Automatic SSL
- First deploy takes ~2–4 minutes → done

Services in docker-compose.yml:
- redis (redis:7-alpine)
- app (NestJS backend on port 3000 inside the network)
- web-customer (Nginx serving customer SPA on port 8080 → 80 in container)
- web-staff (Nginx serving staff SPA on port 8081 → 80 in container)

Static File Serving (production)
- Each SPA is built with Vite and served by its own Nginx container.
- Nginx proxies /api and /auth to the backend service `app:3000`.
- SPA fallback and long-term caching are configured in the Nginx configs under apps/*/nginx.conf.

Platform Kill-Switch (initial middleware)
A small middleware enforces hard-offline mode for customer routes:
- Keys used in Redis:
  - platform:status → "online" | "soft-offline" | "hard-offline" (default: online)
  - platform:offline_message → string (optional)
  - platform:offline_until → unix timestamp (optional)
- hard-offline returns a static offline HTML
- soft-offline is surfaced by the customer SPA as an overlay (checkout disabled)

Note: Because Nginx serves statics, the hard-offline enforcement happens when the browser requests any API from the customer app. If you want to block the entire site at the edge, you can add a simple conditional in the Nginx config that queries a backend endpoint or toggles via env; for now we keep backend enforcement to stay simple.

Redis commands examples (in redis-cli):
SET platform:status soft-offline
SET platform:offline_message "Volvemos en 10 minutos"

To fully block customers:
SET platform:status hard-offline

Next Steps (roadmap excerpt)
- Implement authentication bootstrap (first admin, permanent tokens, QR onboarding)
- Define Redis data models (items, orders) and atomic transitions
- Real-time updates via Socket.io + Redis adapter (rooms: customers, staff, kitchen, cashier)
- Menu, cart, stock validation flows in customer app
- MercadoPago Checkout Pro integration and webhook/ACK handling
- Staff dashboards (cashier, stock manager, fulfillment, global operations)

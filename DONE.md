# Progress Log — Buffet Project

Date: 2025-11-18 16:36 (local)

This file tracks implementation progress against SPECS.md, decisions, and next steps.

## Scope for this iteration

- Focus: Staff webapp features (frontend only — no backend changes)
- Goal: Implement the remaining staff webapp features outlined in SPECS.md with a frontend that can run now against mocks and seamlessly switch to the backend when it’s ready.

## What’s done

1) Staff Webapp (app-staff) — UI, navigation, and core tools
   - App shell with mobile-first layout and top navigation: Dashboard, Órdenes, Inventario, Menú, Usuarios.
   - Vue Router configured and pages created:
     - Dashboard: order counters (recibidas, preparando, listas, pendiente cash) and low-stock highlights.
     - Órdenes: simple order board with status progression (awaiting-cash → received → preparing → ready → completed), cancel/complete actions.
     - Inventario: list items with current stock, quick stock adjust buttons (-5/-1/+1/+5), inline low-stock threshold editing with persistence.
     - Menú: CRUD (upsert) for categorías and items (name, category, price, GF, active), and list with availability indicators.
     - Usuarios: placeholder explaining upcoming roles and permissions (Stock manager, Cashier, Platform Admin).
   - API client (`app-staff/src/lib/api.ts`) that targets backend base URL and version via env (`VITE_API_BASE_URL`, default `http://localhost:3000`; `VITE_API_VERSION`, default `v1`). Includes a small local mock fallback for development if backend is offline.
   - Minimal state for orders (`app-staff/src/store/orders.ts`) with `localStorage` seed to simulate real flows while backend is under construction.
   - Vite config includes Vue plugin and a dev proxy for `/api` so the app can switch to the live backend by running it on port 3000.

2) Customer/Backend context from previous iteration (unchanged; listed here for continuity only)
   - Existing public endpoints and Redis models remain as documented; no backend files were modified in this iteration.

3) Wiring
- `AppModule` updated to register `MenuService`, `MenuController`, and `StaffController`.
- Fixed `AppController` to import `RedisService` without `.js` suffix.

4) Logging (backend)
- Added structured logging using Nest `Logger` with configurable level via `LOG_LEVEL` env var (`error|warn|info|debug|verbose`).
- Request correlation:
  - New middleware attaches `X-Request-Id` (uses incoming header or generates one) and includes it in responses.
  - HTTP request logger middleware logs method, path, status, duration, request id, and client IP.
- Service/controller logs:
  - `RedisService` logs connect/reconnect/errors and graceful shutdown.
  - `AppController` logs health and platform status checks (debug level).
  - `MenuController` logs public menu fetch with category/item counts (debug level).
  - `StaffController` logs category/item upserts and stock adjustments (ids, deltas, outcomes).

## How to try it (staff webapp)

Local dev (frontend only):

```
cd app-staff
npm install
npm run dev
```

- Open http://localhost:5174
- The app will call the backend directly using `VITE_API_BASE_URL` and `VITE_API_VERSION`.
  - Defaults are `http://localhost:3000` and `v1`, so no extra config is needed for local dev.
  - Optionally set `VITE_API_BASE_URL` and/or `VITE_API_VERSION` to point to a different server/version.

Key interactions to validate:
- Dashboard shows counters seeded from mock orders and low-stock alerts from mock menu items.
- Órdenes page lets you advance/cancel/complete orders (updates persist in localStorage).
- Inventario allows stock adjustments and low-stock threshold updates. When backend is ready, these calls will hit:
  - `POST /api/staff/menu/items/:id/stock` with `{ delta }`
  - `PUT  /api/staff/menu/items/:id` with `{ lowStockThreshold }`
- Menú lets you upsert categorías and items. When backend is ready, these map to:
  - `PUT /api/staff/menu/categories/:id`
  - `PUT /api/staff/menu/items/:id`

Backend API examples (reference only; unchanged in this iteration):

Seed a category and item:

```
curl -X PUT http://localhost:3000/api/staff/menu/categories/parrilla \
  -H 'Content-Type: application/json' \
  -d '{"name":"PARRILLA","order":1}'

curl -X PUT http://localhost:3000/api/staff/menu/items/choripan \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Choripán",
    "categoryId":"parrilla",
    "price":2500,
    "isGlutenFree":false,
    "stock":12,
    "lowStockThreshold":3
  }'

curl -X POST http://localhost:3000/api/staff/menu/items/choripan/stock \
  -H 'Content-Type: application/json' \
  -d '{"delta":-2}'
```

Fetch public menu:

```
curl http://localhost:3000/api/menu | jq
```

Example response shape:

```
{
  "categories": [
    {
      "id": "parrilla",
      "name": "PARRILLA",
      "order": 1,
      "items": [
        {
          "id": "choripan",
          "name": "Choripán",
          "price": 2500,
          "imageUrl": null,
          "isGlutenFree": false,
          "stock": 10,
          "availability": "in-stock"
        }
      ]
    }
  ],
  "glutenFree": []
}
```

## Notes & decisions

Frontend-only iteration decisions:
- Frontend now starts replacing mocks with real API calls as backend endpoints are available.
- The SPA’s API base defaults to `/api` and can be overridden via `VITE_API_BASE`. In dev, Vite proxies `/api` to `http://localhost:3000` if available.
- State is deliberately simple (Vue reactivity + localStorage) to enable quick iteration; can be migrated to Pinia/Vue Query later.
- UI is mobile-first with light CSS in `App.vue`; no external UI kit to keep build small.

## Implemented requests (this iteration)

Staff app (app-staff) now uses REAL API for:

- GET `/v1/staff/menu/items` → wired in `src/pages/Menu.vue` using `getStaffItems()` from `src/lib/api.ts`.
  - Replaced hardcoded rows with live data.
  - Displays price, current stock, and availability badge computed as:
    - `sold-out` when `stock <= 0`
    - `limited` when `stock <= lowStockThreshold` and threshold > 0
    - `in-stock` otherwise
  - Added loading state and error toast when the server is unreachable.

Notes:
- Next steps will wire up PUT `/v1/staff/menu/items/:id` and POST `/v1/staff/menu/items/:id/stock` from the Menu/Inventory flows (UI hooks already exist, but actions still point to placeholders).

## Next steps

Staff webapp (frontend):
1) Fulfillment board per SPECS (columns, drag-and-drop, timers) and real-time updates (Socket.io) — pending backend events.
2) Cash operations view for orders pending cash collection, with receipt print/QR flow.
3) Platform status admin controls (soft/hard offline toggles) once the endpoint exists.
4) Auth and role-based access (guard routes/components when backend auth is ready).
5) Polish UI (filters, search, pagination) and accessibility pass.

Backend (reference — unchanged here):
1) Cart/stock validation endpoints
2) Order flow (reserve/finalize/revert on payment)
3) MercadoPago integration + webhook
4) Admin/staff auth and roles
5) Platform status mutations

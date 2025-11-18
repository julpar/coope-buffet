# Progress Log — Buffet Project

Date: 2025-11-18 14:43 (local)

This file tracks implementation progress against SPECS.md, decisions, and next steps.

## Scope for this iteration

- Focus: API (per user update)
- Goal: Provide initial Redis-backed Menu and Inventory endpoints to support the customer app and staff tools.

## What’s done

1) Backend structure and health
- Existing health and platform status endpoints kept intact under `GET /api/health` and `GET /api/platform/status`.

2) Menu and Inventory (Redis-based)
- Data model (Redis):
  - `menu:categories` — JSON array of `{ id, name, order }`.
  - `menu:items` — Redis Hash mapping `itemId -> JSON` of `{ id, name, categoryId, price, isGlutenFree?, imageUrl?, stock?, lowStockThreshold?, active? }`.
- Service: `MenuService` with methods to list/upsert categories and items, adjust stock, and compute a public projection for customers (availability: `in-stock`, `limited`, `sold-out`).
- Public API: `GET /api/menu` — returns categories with items and a separate `glutenFree` collection derived from items flagged `isGlutenFree`.
- Staff API (no auth yet; to be secured later):
  - `GET /api/staff/menu/categories`
  - `PUT /api/staff/menu/categories/:id` (upsert)
  - `GET /api/staff/menu/items`
  - `PUT /api/staff/menu/items/:id` (upsert; requires `categoryId`)
  - `POST /api/staff/menu/items/:id/stock` with body `{ delta }` to increment/decrement stock (clamped to 0).

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

## How to try it (examples)

Assumptions: backend running on port 3000 and Redis reachable via `REDIS_URL` (docker-compose sets it for the app service).

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

- Availability labeling follows SPECS: `sold-out` when stock <= 0; `limited` when `stock <= lowStockThreshold` and threshold > 0; otherwise `in-stock`.
- `active` field lets us hide an item from the public menu without deletion.
- Category list is kept as a single JSON array to preserve order; items are stored in a hash for efficient per-item updates.
- Staff endpoints are intentionally simple; they will be protected (auth/roles) in a future step.
- Logging defaults to `info` level in `docker-compose.yml`. To see debug logs locally set `LOG_LEVEL=debug` and restart the backend. You can also pass a correlation header like `X-Request-Id` to trace a call end-to-end.

## Next steps (API)

1) Cart/stock validation endpoints
   - Accept a cart payload, validate availability and return normalized items/prices and warnings.
2) Order flow skeleton
   - Create order with reserved stock (pending) and finalize on payment confirmation; revert on failure.
3) MercadoPago integration scaffold
   - Create preference endpoint; webhook handler with idempotency and signature verification.
4) Admin/staff auth and role checks
   - Protect `/api/staff/*` with role-based access.
5) Platform status admin endpoint
   - Mutations for `platform:status`, `platform:offline_message`, `platform:offline_until`.

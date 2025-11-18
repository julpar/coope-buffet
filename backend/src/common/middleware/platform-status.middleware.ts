import type { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// Lightweight Redis client for middleware-only usage (separate from Nest DI)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
});
let connected = false;
async function ensureConnected() {
  if (!connected) {
    try {
      await redis.connect();
      connected = true;
    } catch {
      // ignore; treat as online if Redis unavailable
    }
  }
}

type PlatformStatus = 'online' | 'soft-offline' | 'hard-offline';

export function platformStatusMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only enforce for customer-facing routes; allow API/auth/staff always
    const path = req.path;
    if (path.startsWith('/api') || path.startsWith('/auth') || path.startsWith('/staff')) {
      return next();
    }

    await ensureConnected();
    let status: PlatformStatus = 'online';
    try {
      const v = await redis.get('platform:status');
      status = (v as PlatformStatus) || 'online';
    } catch {
      // default online
    }

    if (status === 'hard-offline') {
      // Serve a minimal offline page (SPA can override with its own route if present)
      res.status(503).send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fuera de servicio</title>
    <style>body{margin:0;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#111;color:#fff;text-align:center;padding:24px} .card{max-width:640px} h1{font-size:28px;margin:0 0 12px} p{opacity:.85;line-height:1.4}</style>
  </head>
  <body>
    <div class="card">
      <h1>Servicio no disponible</h1>
      <p>El buffet está temporalmente fuera de servicio. Intenta nuevamente más tarde.</p>
    </div>
  </body>
</html>`);
      return;
    }

    // soft-offline is handled by the frontend UI; continue
    return next();
  };
}

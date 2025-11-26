import type { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { API_PREFIX } from '../constants';

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
    // Only enforce for customer-facing routes; allow staff and auth always
    const path = req.path;
    // Bypass for staff/admin tools (versioned) and auth endpoints (non-versioned)
    if (
      path.startsWith(`${API_PREFIX}/staff`) ||
      // Auth endpoints: allow both versioned and non-versioned paths just in case
      path.startsWith(`${API_PREFIX}/auth`) ||
      path.startsWith('/auth') ||
      // Always allow public status and health probes even when offline
      path.startsWith(`${API_PREFIX}/platform/status`) ||
      path.startsWith(`${API_PREFIX}/health`)
    ) {
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
      // Return JSON instead of HTML when platform is hard-offline
      res.status(503).json({
        status: 'hard-offline',
        error: 'Service Unavailable',
        message:
          'El buffet está temporalmente fuera de servicio. Intenta nuevamente más tarde.',
        code: 503,
        path: req.path,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // soft-offline is handled by the frontend UI; continue
    return next();
  };
}

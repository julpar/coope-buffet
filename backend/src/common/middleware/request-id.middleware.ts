import type { Request, Response, NextFunction } from 'express';

function genId() {
  // Simple, URL-safe 16-char id: time (base36) + random
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${t}${r}`;
}

declare module 'http' {
  interface IncomingMessage {
    id?: string;
  }
}

export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = (req.headers['x-request-id'] || req.headers['x-correlation-id']) as string | undefined;
    const id = (incoming && String(incoming)) || genId();
    req.id = id;
    res.setHeader('X-Request-Id', id);
    next();
  };
}

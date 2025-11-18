import type { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

const httpLogger = new Logger('HTTP');

export function requestLoggerMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    const id = (req as any).id as string | undefined;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip;
    const cl = req.headers['content-length'];
    const bodyInfo = req.body && typeof req.body === 'object' ? Object.keys(req.body).length : 0;

    res.on('finish', () => {
      const durationMs = Number((process.hrtime.bigint() - start) / 1000000n);
      const status = res.statusCode;
      const msg = `${method} ${url} ${status} ${durationMs}ms`;
      const meta = { rid: id, ip, inBytes: cl ? Number(cl) : undefined, bodyKeys: bodyInfo || undefined } as Record<string, unknown>;

      if (status >= 500) httpLogger.error(msg, undefined, JSON.stringify(meta));
      else if (status >= 400) httpLogger.warn(msg + ` rid=${id ?? '-'} ip=${ip}`);
      else httpLogger.log(msg + ` rid=${id ?? '-'} ip=${ip}`);
    });

    next();
  };
}

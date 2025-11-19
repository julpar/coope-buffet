import 'reflect-metadata';
// Ensure backend/.env is loaded regardless of current working directory
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { platformStatusMiddleware } from './common/middleware/platform-status.middleware';
import { API_VERSION } from './common/constants';
import { requestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { makeSessionMiddleware } from './common/middleware/session.middleware';
import { UserService } from './modules/core/user.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Explicit CORS configuration to support local apps (e.g., Vite on :5175) and cookies
  // Allow overriding/adding CORS origins from env.
  // Use CORS_ORIGINS as a comma-separated list, e.g.:
  //   CORS_ORIGINS="https://staff.example.com,https://customer.example.com"
  // Special handling:
  // - entries starting with "." or "*." mean suffix match (e.g., ".example.com" allows https://foo.example.com)
  // - set CORS_ALLOW_ALL=true to allow any origin (use with caution)
  const defaultOrigins = [
    'http://localhost:5173', // common Vite default
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    // Static Nginx-served apps from docker-compose for customer/staff
    'http://localhost:8080', // web-customer
    'http://localhost:8081', // web-staff
  ];

  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

  const allowAll = String(process.env.CORS_ALLOW_ALL || '').toLowerCase() === 'true';

  // Pre-compute suffix patterns like .example.com or *.example.com
  const originSuffixes = allowedOrigins
    .map((o) => (o.startsWith('*.') ? o.slice(1) : o))
    .filter((o) => o.startsWith('.'));
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl) or from our whitelist
      if (!origin) return callback(null, true);

      if (allowAll) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow suffix matches like .example.com (covers subdomains)
      if (originSuffixes.some((suf) => origin.endsWith(suf))) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  });

  // eslint-disable-next-line no-console
  console.log('[CORS] allowed origins:', allowedOrigins);
  if (originSuffixes.length) {
    // eslint-disable-next-line no-console
    console.log('[CORS] allowed suffixes:', originSuffixes);
  }
  if (allowAll) {
    // eslint-disable-next-line no-console
    console.warn('[CORS] CORS_ALLOW_ALL=true — allowing any origin');
  }

  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true }));

  // Global API prefix, e.g., /v1
  app.setGlobalPrefix(API_VERSION);

  // Request logger
  app.use(requestLoggerMiddleware());

  // Attach session user from cookie for all routes (after cookies parsed)
  const userSvc = app.get(UserService);
  app.use(makeSessionMiddleware(userSvc));

  // Platform status enforcement for customer-facing routes
  app.use(platformStatusMiddleware());

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Server running on http://0.0.0.0:${port}`);
}

bootstrap();

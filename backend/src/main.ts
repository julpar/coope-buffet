import 'reflect-metadata';
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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

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

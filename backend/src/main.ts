import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { platformStatusMiddleware } from './common/middleware/platform-status.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true }));

  // Platform status enforcement for customer-facing routes
  app.use(platformStatusMiddleware());

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Server running on http://0.0.0.0:${port}`);
}

bootstrap();

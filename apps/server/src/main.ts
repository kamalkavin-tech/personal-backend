import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

let appPromise: Promise<INestApplication> | undefined;

async function buildApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(express()), {
    bufferLogs: false,
  });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('FRONTEND_URL') ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.init();
  return app;
}

function getApp(): Promise<INestApplication> {
  if (!appPromise) {
    appPromise = buildApp();
  }
  return appPromise;
}

export default async function handler(req: Request, res: Response) {
  const app = await getApp();
  return app.getHttpAdapter().getInstance()(req, res);
}

if (require.main === module) {
  void (async () => {
    const app = await getApp();
    const port = Number(process.env.PORT ?? 4000);
    await app.listen(port);
    console.log(`[vaultx-server] listening on http://localhost:${port}/api`);
  })();
}

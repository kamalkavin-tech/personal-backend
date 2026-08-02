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

  // Public readiness probe (bypasses the /api prefix; registered on the raw express app).
  const expressApp = app.getHttpAdapter().getInstance() as express.Express;
  expressApp.get(['/', '/health'], (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'vaultx-server', time: new Date().toISOString() });
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
  try {
    const app = await getApp();
    return app.getHttpAdapter().getInstance()(req, res);
  } catch (error) {
    // Cold-start init failed (e.g. DB unreachable on a fresh instance).
    // Reset so the next invocation can retry instead of reusing a dead promise.
    appPromise = undefined;
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('[vaultx-server] handler init failed:', message);
    if (!res.headersSent) {
      res.status(500).json({ statusCode: 500, message: 'Internal server error', detail: message });
    }
  }
}

if (require.main === module) {
  void (async () => {
    const app = await getApp();
    const port = Number(process.env.PORT ?? 4000);
    await app.listen(port);
    console.log(`[vaultx-server] listening on http://localhost:${port}/api`);
  })();
}

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

let appPromise: Promise<INestApplication> | undefined;

/** Routes that must respond even when the DB/Redis are unreachable (cold-start probes). */
function registerProbes(expressApp: express.Express): void {
  expressApp.get(['/', '/health'], (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'vaultx-server', time: new Date().toISOString() });
  });
  expressApp.get('/favicon.ico', (_req: Request, res: Response) => {
    res.status(204).end();
  });
}

async function buildApp(): Promise<INestApplication> {
  const rawApp = express();
  registerProbes(rawApp);

  const app = await NestFactory.create(AppModule, new ExpressAdapter(rawApp), {
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

  try {
    await app.init();
  } catch (error) {
    // DB/Redis unreachable (e.g. MONGO_URI missing on a fresh deploy).
    // Probes keep answering and /api returns 503 instead of the function crashing.
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('[vaultx-server] app.init failed (probes only):', message);
    rawApp.use('/api', (_req: Request, res: Response) => {
      res.status(503).json({
        statusCode: 503,
        message: 'Service unavailable - backend dependencies (MongoDB) are not reachable. Check MONGO_URI and Vercel env vars.',
        detail: message,
      });
    });
  }
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

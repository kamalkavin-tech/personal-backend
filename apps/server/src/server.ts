import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { corsHeaders } from './cors';

/** Routes that answer even when the DB/Redis are unreachable. */
function registerProbes(expressApp: express.Express): void {
  expressApp.get(['/', '/health'], (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'vaultx-server', time: new Date().toISOString() });
  });
  expressApp.get('/favicon.ico', (_req: Request, res: Response) => {
    res.status(204).end();
  });
}

function registerDependencyFallback(expressApp: express.Express, detail: string): void {
  // Answer CORS preflights + real requests with a clear 503 when the DB is unreachable.
  const attachCors = (_req: Request, res: Response, next: NextFunction) => {
    res.set(corsHeaders());
    next();
  };
  expressApp.use('/api', attachCors, (req: Request, res: Response) => {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    res.status(503).json({
      statusCode: 503,
      message:
        'Service unavailable - backend dependencies (MongoDB) are not reachable. Check that MONGO_URI is set in the Vercel environment variables.',
      detail,
    });
  });
}

export async function buildServerApp(): Promise<INestApplication> {
  const rawApp = express();
  registerProbes(rawApp);

  const app = await NestFactory.create(AppModule, new ExpressAdapter(rawApp), {
    bufferLogs: false,
  });

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: true, // reflect any origin; safe because credentials: false
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  try {
    await app.init();
  } catch (error) {
    // DB/Redis unreachable (e.g. MONGO_URI missing on a fresh deploy).
    // Probes keep answering and /api returns 503 instead of the function crashing.
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('[vaultx-server] app.init failed (probes only):', message);
    registerDependencyFallback(rawApp, message);
  }
  return app;
}

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

let appPromise: Promise<INestApplication> | undefined;

function originAllowed(origin: string | undefined, frontendUrl: string | undefined): boolean {
  if (!origin) return true; // non-browser requests (curl, server-to-server)
  const normalized = origin.replace(/\/$/, '');
  if (frontendUrl && normalized === frontendUrl.replace(/\/$/, '')) return true;
  if (normalized === 'http://localhost:3000' || normalized === 'http://localhost:5173') return true;
  // Vercel production + preview deployments (frontend.vercel.app / *.vercel.app)
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(normalized);
}

function corsHeaders(origin: string | undefined, frontendUrl: string | undefined): Record<string, string> {
  const allowed = originAllowed(origin, frontendUrl) ? origin ?? '*' : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/** Routes that must respond even when the DB/Redis are unreachable (cold-start probes). */
function registerProbes(expressApp: express.Express): void {
  expressApp.get(['/', '/health'], (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'vaultx-server', time: new Date().toISOString() });
  });
  expressApp.get('/favicon.ico', (_req: Request, res: Response) => {
    res.status(204).end();
  });
}

function registerDependencyFallback(expressApp: express.Express, frontendUrl: string | undefined, detail: string): void {
  // Answer CORS preflights + real requests with a clear 503 when the DB is unreachable.
  const attachCors = (req: Request, res: Response, next: NextFunction) => {
    res.set(corsHeaders(req.headers.origin, frontendUrl));
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

async function buildApp(): Promise<INestApplication> {
  const rawApp = express();
  registerProbes(rawApp);

  const app = await NestFactory.create(AppModule, new ExpressAdapter(rawApp), {
    bufferLogs: false,
  });
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL');

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => callback(null, originAllowed(origin ?? undefined, frontendUrl)),
    credentials: true,
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
    registerDependencyFallback(rawApp, frontendUrl, message);
  }
  return app;
}

function getApp(): Promise<INestApplication> {
  if (!appPromise) {
    appPromise = buildApp();
  }
  return appPromise;
}

const PROBE_PATHS = new Set(['/', '/health', '/favicon.ico']);

export default async function handler(req: Request, res: Response) {
  const rawUrl = (req as { url?: string }).url ?? '/';
  const path = rawUrl.split('?')[0];

  // Probes must answer FAST without bootstrapping NestJS + MongoDB.
  // On Vercel Hobby (10s cap), bootstrapping on a cold start would crash.
  if (PROBE_PATHS.has(path)) {
    if (path === '/favicon.ico') {
      res.status(204).end();
      return;
    }
    res.json({ status: 'ok', service: 'vaultx-server', time: new Date().toISOString() });
    return;
  }

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
      res.set(corsHeaders(req.headers.origin, undefined));
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

/**
 * Serverless entrypoint for Vercel.
 *
 * IMPORTANT: keep this file dependency-light (express + cors only). Vercel loads
 * this module for EVERY request; if it statically imported NestJS/@node-rs/argon2
 * and any of those failed to load at runtime, even /health would crash with
 * FUNCTION_INVOCATION_FAILED. The full Nest app is dynamically imported only when
 * a real /api request arrives.
 */
import express, { Request, Response } from 'express';
import { corsHeaders, parseCorsOrigins } from './cors';

const PROBE_PATHS = new Set(['/', '/health', '/favicon.ico']);
const allowedOrigins = [
  ...parseCorsOrigins(process.env.CORS_ORIGINS),
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_FRONTEND_URL,
  'https://personal-frontend-web.vercel.app',
]
  .filter(Boolean)
  .filter((value, index, self) => self.indexOf(value) === index) as string[];

type ServerModule = { buildServerApp: () => Promise<import('@nestjs/common').INestApplication> };
let serverModulePromise: Promise<ServerModule> | undefined;
let appPromise: Promise<import('@nestjs/common').INestApplication> | undefined;

const rawApp = express();
rawApp.use('/api', (req, res, next) => {
  res.set(corsHeaders(req.headers.origin as string | undefined, allowedOrigins));
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

async function getServerApp(): Promise<import('@nestjs/common').INestApplication> {
  if (!appPromise) {
    serverModulePromise = import('./server');
    appPromise = serverModulePromise.then((mod) => mod.buildServerApp());
  }
  return appPromise;
}

export default async function handler(req: Request, res: Response) {
  const rawUrl = (req as { url?: string }).url ?? '/';
  const path = rawUrl.split('?')[0];

  if (PROBE_PATHS.has(path)) {
    if (path === '/favicon.ico') {
      res.status(204).end();
      return;
    }
    res.json({ status: 'ok', service: 'vaultx-server', time: new Date().toISOString() });
    return;
  }

  try {
    const app = await getServerApp();
    const expressApp = app.getHttpAdapter().getInstance() as express.Express;
    return expressApp(req, res);
  } catch (error) {
    appPromise = undefined;
    const message = error instanceof Error ? error.message : String(error);
    console.error('[vaultx-server] handler init failed:', message);
    if (!res.headersSent) {
      res.set(corsHeaders(req.headers.origin as string | undefined, allowedOrigins));
      res.status(500).json({ statusCode: 500, message: 'Internal server error', detail: message });
    }
  }
}

if (require.main === module) {
  void (async () => {
    const port = Number(process.env.PORT ?? 4000);
    const app = await getServerApp();
    await app.listen(port);
    console.log(`[vaultx-server] listening on http://localhost:${port}/api`);
  })();
}

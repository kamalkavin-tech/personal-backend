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
import { corsHeaders } from './cors';

const PROBE_PATHS = new Set(['/', '/health', '/favicon.ico']);

type ServerModule = { buildServerApp: () => Promise<import('@nestjs/common').INestApplication> };
let serverModulePromise: Promise<ServerModule> | undefined;
let appPromise: Promise<import('@nestjs/common').INestApplication> | undefined;

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

  // Probes answer instantly without bootstrapping NestJS + MongoDB (Vercel Hobby caps
  // function runtime at 10s; a cold bootstrap with Mongo connect would blow past it).
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
    // Cold-start init failed (e.g. DB unreachable or dependency failed to load).
    // Reset so the next invocation can retry instead of reusing a dead promise.
    appPromise = undefined;
    serverModulePromise = undefined;
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('[vaultx-server] handler init failed:', message);
    if (!res.headersSent) {
      res.set(corsHeaders());
      res.status(500).json({ statusCode: 500, message: 'Internal server error', detail: message });
    }
  }
}

// Standalone (non-serverless) mode: npm run dev / npm start.
if (require.main === module) {
  void (async () => {
    const port = Number(process.env.PORT ?? 4000);
    const app = await getServerApp();
    await app.listen(port);
    console.log(`[vaultx-server] listening on http://localhost:${port}/api`);
  })();
}

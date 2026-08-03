import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { corsHeaders, parseCorsOrigins } from './cors';

function getAllowedOrigins(): string[] {
  return [
    ...parseCorsOrigins(process.env.CORS_ORIGINS),
    process.env.FRONTEND_URL ?? '',
  ]
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);
}

/** Routes that answer even when the DB/Redis are unreachable. */
function registerProbes(expressApp: express.Express): void {
  expressApp.get(['/', '/health'], (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'vaultx-server', time: new Date().toISOString() });
  });
  expressApp.get('/favicon.ico', (_req: Request, res: Response) => {
    res.status(204).end();
  });
}

function registerDependencyFallback(expressApp: express.Express, detail: string, allowedOrigins: string[]): void {
  const attachCors = (_req: Request, res: Response, next: NextFunction) => {
    res.set(corsHeaders(_req.headers.origin as string | undefined, allowedOrigins));
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

  const allowedOrigins = getAllowedOrigins();
  const corsOrigins = allowedOrigins.length ? allowedOrigins : ['http://localhost:3000'];

  const app = await NestFactory.create(AppModule, new ExpressAdapter(rawApp), {
    bufferLogs: false,
  });

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalFilters(new AllExceptionsFilter(allowedOrigins));

  try {
    await app.init();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('[vaultx-server] app.init failed (probes only):', message);
    registerDependencyFallback(rawApp, message, allowedOrigins);
  }
  return app;
}

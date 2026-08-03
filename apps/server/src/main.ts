import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export async function createApp(adapter?: ExpressAdapter) {
  const app = await NestFactory.create(AppModule, adapter, { bufferLogs: false });
  const config = app.get(ConfigService);

  const corsOrigins = [
    ...parseCorsOrigins(config.get<string>('CORS_ORIGINS')),
    config.get<string>('FRONTEND_URL') ?? '',
  ]
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalFilters(new AllExceptionsFilter(corsOrigins));

  return app;
}

export async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);
  const port = Number(config.get('PORT') ?? 4000);
  await app.listen(port);
  console.log(`[vaultx-server] listening on http://localhost:${port}/api`);
}

if (require.main === module) void bootstrap();

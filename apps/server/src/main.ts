import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('FRONTEND_URL') ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = Number(config.get('PORT') ?? 4000);
  await app.listen(port);
  console.log(`[vaultx-server] listening on http://localhost:${port}/api`);
}

bootstrap();

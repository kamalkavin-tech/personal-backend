import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { RedisModule } from './redis/redis.module';
import { EncryptionModule } from './encryption/encryption.module';
import { AuditModule } from './audit/audit.module';
import { DataModule } from './data/data.module';
import { AuthModule } from './auth/auth.module';
import { VaultModule } from './vault/vault.module';
import { FilesModule } from './files/files.module';
import { BackupModule } from './backup/backup.module';
import { SecurityModule } from './security/security.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StatsModule } from './stats/stats.module';
import { ThrottlerBehindProxyGuard } from './common/throttler-behind-proxy.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGO_URI') ??
          'mongodb://vaultx:vaultx-secret@localhost:27017/vaultx?authSource=admin',
        // Fail fast on cold starts (serverless) instead of hanging ~30s
        // waiting for an unreachable database.
        serverSelectionTimeoutMS: Number(config.get('MONGO_SERVER_SELECTION_TIMEOUT_MS') ?? 5000),
        bufferCommands: false,
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('THROTTLE_TTL') ?? 60),
            limit: Number(config.get('THROTTLE_LIMIT') ?? 60),
          },
        ],
      }),
    }),
    RedisModule,
    EncryptionModule,
    AuditModule,
    DataModule,
    AuthModule,
    VaultModule,
    FilesModule,
    BackupModule,
    SecurityModule,
    NotificationsModule,
    StatsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}

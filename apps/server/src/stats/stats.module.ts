import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { VaultModule } from '../vault/vault.module';
import { FilesModule } from '../files/files.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [VaultModule, FilesModule, SecurityModule],
  controllers: [StatsController],
})
export class StatsModule {}

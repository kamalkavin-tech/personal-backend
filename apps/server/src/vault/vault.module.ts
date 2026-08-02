import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { VaultEntry, VaultEntrySchema } from './schemas/vault-entry.schema';
import { Folder, FolderSchema } from './schemas/folder.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VaultEntry.name, schema: VaultEntrySchema },
      { name: Folder.name, schema: FolderSchema },
    ]),
  ],
  controllers: [VaultController],
  providers: [VaultService],
  exports: [VaultService, MongooseModule],
})
export class VaultModule {}

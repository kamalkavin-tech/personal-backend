import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { Backup, BackupSchema } from './schemas/backup.schema';
import { VaultEntry, VaultEntrySchema } from '../vault/schemas/vault-entry.schema';
import { Folder, FolderSchema } from '../vault/schemas/folder.schema';
import { Album, AlbumSchema } from '../files/schemas/album.schema';
import { FileEntry, FileEntrySchema } from '../files/schemas/file-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Backup.name, schema: BackupSchema },
      { name: VaultEntry.name, schema: VaultEntrySchema },
      { name: Folder.name, schema: FolderSchema },
      { name: Album.name, schema: AlbumSchema },
      { name: FileEntry.name, schema: FileEntrySchema },
    ]),
  ],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}

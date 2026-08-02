import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Device, DeviceSchema } from '../auth/schemas/device.schema';
import { Session, SessionSchema } from '../auth/schemas/session.schema';
import { AuthEvent, AuthEventSchema } from '../auth/schemas/auth-event.schema';
import { VaultEntry, VaultEntrySchema } from '../vault/schemas/vault-entry.schema';
import { Folder, FolderSchema } from '../vault/schemas/folder.schema';
import { FileEntry, FileEntrySchema } from '../files/schemas/file-entry.schema';
import { Album, AlbumSchema } from '../files/schemas/album.schema';
import { Backup, BackupSchema } from '../backup/schemas/backup.schema';
import { Notification, NotificationSchema } from '../notifications/notification.schema';
import { CleanupService } from './cleanup.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: Session.name, schema: SessionSchema },
      { name: AuthEvent.name, schema: AuthEventSchema },
      { name: VaultEntry.name, schema: VaultEntrySchema },
      { name: Folder.name, schema: FolderSchema },
      { name: FileEntry.name, schema: FileEntrySchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Backup.name, schema: BackupSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [CleanupService],
  exports: [CleanupService],
})
export class DataModule {}

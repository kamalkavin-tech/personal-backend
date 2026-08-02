import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { GridFSBucket, ObjectId, Db } from 'mongodb';
import { User } from '../auth/schemas/user.schema';
import { Device } from '../auth/schemas/device.schema';
import { Session } from '../auth/schemas/session.schema';
import { AuthEvent } from '../auth/schemas/auth-event.schema';
import { VaultEntry } from '../vault/schemas/vault-entry.schema';
import { Folder } from '../vault/schemas/folder.schema';
import { FileEntry } from '../files/schemas/file-entry.schema';
import { Album } from '../files/schemas/album.schema';
import { Backup } from '../backup/schemas/backup.schema';
import { Notification } from '../notifications/notification.schema';

@Injectable()
export class CleanupService {
  private bucket: GridFSBucket;

  constructor(
    @InjectConnection() connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(AuthEvent.name) private readonly authEventModel: Model<AuthEvent>,
    @InjectModel(VaultEntry.name) private readonly vaultEntryModel: Model<VaultEntry>,
    @InjectModel(Folder.name) private readonly folderModel: Model<Folder>,
    @InjectModel(FileEntry.name) private readonly fileEntryModel: Model<FileEntry>,
    @InjectModel(Album.name) private readonly albumModel: Model<Album>,
    @InjectModel(Backup.name) private readonly backupModel: Model<Backup>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
  ) {
    this.bucket = new GridFSBucket(connection.db as unknown as Db, { bucketName: 'files' });
  }

  getBucket(): GridFSBucket {
    return this.bucket;
  }

  async purgeUserFiles(userId: string): Promise<void> {
    const entries = await this.fileEntryModel.find({ userId }).lean();
    for (const entry of entries) {
      try {
        await this.bucket.delete(new ObjectId(entry.fsId));
      } catch {
        /* ignore missing file */
      }
    }
  }

  async purgeUserData(userId: string): Promise<void> {
    await this.purgeUserFiles(userId);
    await Promise.all([
      this.vaultEntryModel.deleteMany({ userId }),
      this.folderModel.deleteMany({ userId }),
      this.fileEntryModel.deleteMany({ userId }),
      this.albumModel.deleteMany({ userId }),
      this.backupModel.deleteMany({ userId }),
      this.notificationModel.deleteMany({ userId }),
    ]);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.purgeUserFiles(userId);
    await Promise.all([
      this.userModel.deleteOne({ _id: userId }),
      this.deviceModel.deleteMany({ userId }),
      this.sessionModel.deleteMany({ userId }),
      this.authEventModel.deleteMany({ userId }),
      this.vaultEntryModel.deleteMany({ userId }),
      this.folderModel.deleteMany({ userId }),
      this.fileEntryModel.deleteMany({ userId }),
      this.albumModel.deleteMany({ userId }),
      this.backupModel.deleteMany({ userId }),
      this.notificationModel.deleteMany({ userId }),
    ]);
  }
}

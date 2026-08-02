import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { VaultEntry } from '../vault/schemas/vault-entry.schema';
import { Folder } from '../vault/schemas/folder.schema';
import { Album } from '../files/schemas/album.schema';
import { FileEntry } from '../files/schemas/file-entry.schema';
import { Backup } from './schemas/backup.schema';
import { CleanupService } from '../data/cleanup.service';
import { AuditService } from '../audit/audit.service';

export interface BackupDownload {
  stream: Readable;
  backup: Backup;
}

@Injectable()
export class BackupService {
  constructor(
    @InjectModel(Backup.name) private readonly backupModel: Model<Backup>,
    @InjectModel(VaultEntry.name) private readonly vaultModel: Model<VaultEntry>,
    @InjectModel(Folder.name) private readonly folderModel: Model<Folder>,
    @InjectModel(Album.name) private readonly albumModel: Model<Album>,
    @InjectModel(FileEntry.name) private readonly fileModel: Model<FileEntry>,
    private readonly cleanup: CleanupService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, kind: 'auto' | 'manual' = 'manual'): Promise<Backup> {
    const [vault, folders, albums, files] = await Promise.all([
      this.vaultModel.find({ userId, deletedAt: null }).lean(),
      this.folderModel.find({ userId, deletedAt: null }).lean(),
      this.albumModel.find({ userId }).lean(),
      this.fileModel.find({ userId, deletedAt: null }).select('_id kind mime size albumId tags favorite createdAt').lean(),
    ]);

    const snapshot = {
      version: 1,
      kind,
      createdAt: new Date().toISOString(),
      vault: vault.map((v) => ({
        type: v.type,
        encrypted: v.encrypted,
        iv: v.iv,
        title: v.title,
        folderId: v.folderId,
        tags: v.tags,
        favorite: v.favorite,
        pinned: v.pinned,
        archived: v.archived,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
      folders: folders.map((f) => ({ name: f.name, type: f.type, color: f.color, createdAt: f.createdAt })),
      albums: albums.map((a) => ({ name: a.name, createdAt: a.createdAt })),
      files: files.map((f) => ({
        _id: String(f._id),
        kind: f.kind,
        mime: f.mime,
        size: f.size,
        albumId: f.albumId,
        tags: f.tags,
        favorite: f.favorite,
        createdAt: f.createdAt,
      })),
    };

    const buffer = Buffer.from(JSON.stringify(snapshot), 'utf8');
    const filename = `vaultx-backup-${Date.now()}.json`;
    const bucket = this.cleanup.getBucket();
    const uploadStream = bucket.openUploadStream(filename, { contentType: 'application/json', metadata: { userId } });
    const fsId = await new Promise<string>((resolve, reject) => {
      Readable.from(buffer)
        .pipe(uploadStream)
        .on('error', reject)
        .on('finish', () => resolve(String(uploadStream.id)));
    });

    const backup = await this.backupModel.create({ userId, fsId, filename, size: buffer.length, kind });
    await this.audit.log(userId, 'backup.created', { meta: { kind } });
    return backup.toObject();
  }

  async list(userId: string): Promise<Backup[]> {
    return this.backupModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async get(userId: string, id: string): Promise<Backup> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Backup not found');
    const backup = await this.backupModel.findOne({ _id: id, userId }).lean();
    if (!backup) throw new NotFoundException('Backup not found');
    return backup;
  }

  async download(userId: string, id: string): Promise<BackupDownload> {
    const backup = await this.get(userId, id);
    if (!backup.fsId) throw new NotFoundException('Backup has no file');
    const stream = this.cleanup.getBucket().openDownloadStream(new ObjectId(backup.fsId));
    return { stream, backup };
  }

  async restore(userId: string, id: string): Promise<{ restored: number; folders: number; albums: number }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Backup not found');
    const backup = await this.backupModel.findOne({ _id: id, userId });
    if (!backup) throw new NotFoundException('Backup not found');
    if (!backup.fsId) throw new NotFoundException('Backup has no file');
    const chunks: Buffer[] = [];
    const stream = this.cleanup.getBucket().openDownloadStream(new ObjectId(backup.fsId));
    for await (const chunk of stream) chunks.push(chunk);
    const snapshot = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      vault?: Array<Record<string, unknown>>;
      folders?: Array<Record<string, unknown>>;
      albums?: Array<Record<string, unknown>>;
    };

    await Promise.all([
      this.vaultModel.deleteMany({ userId }),
      this.folderModel.deleteMany({ userId }),
      this.albumModel.deleteMany({ userId }),
    ]);

    let restored = 0;
    if (Array.isArray(snapshot.vault)) {
      const docs = snapshot.vault.map((v) => ({
        userId,
        type: v.type,
        encrypted: v.encrypted,
        iv: v.iv,
        title: v.title,
        folderId: v.folderId ?? null,
        tags: v.tags ?? [],
        favorite: v.favorite ?? false,
        pinned: v.pinned ?? false,
        archived: v.archived ?? false,
        deletedAt: null,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      }));
      const inserted = await this.vaultModel.insertMany(docs);
      restored = inserted.length;
    }

    let folderCount = 0;
    if (Array.isArray(snapshot.folders)) {
      const docs = snapshot.folders.map((f) => ({ userId, name: f.name, type: f.type ?? 'all', color: f.color ?? '#6366f1', createdAt: f.createdAt }));
      const inserted = await this.folderModel.insertMany(docs);
      folderCount = inserted.length;
    }

    let albumCount = 0;
    if (Array.isArray(snapshot.albums)) {
      const docs = snapshot.albums.map((a) => ({ userId, name: a.name, createdAt: a.createdAt }));
      const inserted = await this.albumModel.insertMany(docs);
      albumCount = inserted.length;
    }

    backup.restoredAt = new Date();
    backup.markModified('restoredAt');
    await backup.save();
    await this.audit.log(userId, 'backup.restored', { meta: { id, restored } });
    return { restored, folders: folderCount, albums: albumCount };
  }

  async remove(userId: string, id: string): Promise<void> {
    const backup = await this.get(userId, id);
    if (backup.fsId) await this.cleanup.getBucket().delete(new ObjectId(backup.fsId)).catch(() => undefined);
    await this.backupModel.deleteOne({ _id: id, userId });
  }
}

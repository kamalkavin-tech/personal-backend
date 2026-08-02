import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { FileKind, AlbumInput, FILE_KINDS } from '@vaultx/shared';
import { FileEntry } from './schemas/file-entry.schema';
import { Album } from './schemas/album.schema';
import { CleanupService } from '../data/cleanup.service';
import { AuditService } from '../audit/audit.service';

export interface UploadOptions {
  kind: FileKind;
  albumId?: string;
  tags?: string[];
  favorite?: boolean;
  encryptedName: string;
  iv: string;
  contentIv?: string;
}

export interface FileListQuery {
  kind?: FileKind;
  albumId?: string;
  trash?: boolean;
  favorite?: boolean;
  limit?: number;
}

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(FileEntry.name) private readonly fileModel: Model<FileEntry>,
    @InjectModel(Album.name) private readonly albumModel: Model<Album>,
    private readonly cleanup: CleanupService,
    private readonly audit: AuditService,
  ) {}

  private owned(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('File not found');
    return { _id: id, userId };
  }

  async upload(userId: string, file: Express.Multer.File, opts: UploadOptions): Promise<FileEntry> {
    const bucket = this.cleanup.getBucket();
    const uploadStream = bucket.openUploadStream(file.originalname ?? 'encrypted', {
      contentType: file.mimetype,
      metadata: { userId },
    });
    const readable = Readable.from(file.buffer);
    const fsId = await new Promise<string>((resolve, reject) => {
      readable.pipe(uploadStream).on('error', reject).on('finish', () => resolve(String(uploadStream.id)));
    });
    const entry = await this.fileModel.create({
      userId,
      fsId,
      kind: opts.kind,
      mime: file.mimetype,
      size: file.size,
      encryptedName: opts.encryptedName,
      iv: opts.iv,
      contentIv: opts.contentIv ?? '',
      albumId: opts.albumId ?? null,
      tags: opts.tags ?? [],
      favorite: opts.favorite ?? false,
    });
    await this.audit.log(userId, 'files.uploaded', { meta: { kind: opts.kind, size: file.size } });
    return entry.toObject();
  }

  async list(userId: string, q: FileListQuery): Promise<FileEntry[]> {
    const filter: Record<string, unknown> = { userId };
    if (q.trash) {
      filter.deletedAt = { $ne: null };
    } else {
      filter.deletedAt = null;
      if (q.kind && FILE_KINDS.includes(q.kind)) filter.kind = q.kind;
      if (q.albumId) filter.albumId = q.albumId;
      if (q.favorite) filter.favorite = true;
    }
    const limit = Math.min(q.limit ?? 500, 1000);
    return this.fileModel.find(filter).sort({ favorite: -1, createdAt: -1 }).limit(limit).lean();
  }

  async get(userId: string, id: string): Promise<FileEntry> {
    const entry = await this.fileModel.findOne(this.owned(userId, id)).lean();
    if (!entry) throw new NotFoundException('File not found');
    return entry;
  }

  async download(userId: string, id: string): Promise<{ stream: Readable; entry: FileEntry }> {
    const entry = await this.get(userId, id);
    const bucket = this.cleanup.getBucket();
    const stream = bucket.openDownloadStream(new ObjectId(entry.fsId));
    return { stream, entry };
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const entry = await this.fileModel.findOneAndUpdate(this.owned(userId, id), { $set: { deletedAt: new Date() } });
    if (!entry) throw new NotFoundException('File not found');
  }

  async restore(userId: string, id: string): Promise<FileEntry> {
    const entry = await this.fileModel.findOneAndUpdate(this.owned(userId, id), { $set: { deletedAt: null } }, { new: true }).lean();
    if (!entry) throw new NotFoundException('File not found');
    return entry;
  }

  async permanentDelete(userId: string, id: string): Promise<void> {
    const entry = await this.fileModel.findOne(this.owned(userId, id)).lean();
    if (!entry) throw new NotFoundException('File not found');
    await this.cleanup.getBucket().delete(new ObjectId(entry.fsId)).catch(() => undefined);
    await this.fileModel.deleteOne({ _id: id, userId });
  }

  async emptyTrash(userId: string): Promise<number> {
    const entries = await this.fileModel.find({ userId, deletedAt: { $ne: null } }).lean();
    let count = 0;
    for (const entry of entries) {
      await this.cleanup.getBucket().delete(new ObjectId(entry.fsId)).catch(() => undefined);
      count++;
    }
    await this.fileModel.deleteMany({ userId, deletedAt: { $ne: null } });
    return count;
  }

  async toggleFavorite(userId: string, id: string): Promise<FileEntry> {
    const entry = await this.fileModel.findOne(this.owned(userId, id)).lean();
    if (!entry) throw new NotFoundException('File not found');
    const updated = await this.fileModel.findOneAndUpdate({ _id: id, userId }, { $set: { favorite: !entry.favorite } }, { new: true }).lean();
    return updated!;
  }

  async storageUsed(userId: string): Promise<number> {
    const agg = await this.fileModel.aggregate([
      { $match: { userId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    return agg[0]?.total ?? 0;
  }

  async count(userId: string, trash = false): Promise<number> {
    return this.fileModel.countDocuments({ userId, deletedAt: trash ? { $ne: null } : null });
  }

  // ----- Albums -----
  async listAlbums(userId: string): Promise<Album[]> {
    return this.albumModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async createAlbum(userId: string, dto: AlbumInput): Promise<Album> {
    return (await this.albumModel.create({ userId, name: dto.name })).toObject();
  }

  async updateAlbum(userId: string, id: string, dto: Partial<AlbumInput>): Promise<Album> {
    const album = await this.albumModel.findOneAndUpdate({ _id: id, userId }, { $set: dto }, { new: true }).lean();
    if (!album) throw new NotFoundException('Album not found');
    return album;
  }

  async deleteAlbum(userId: string, id: string): Promise<void> {
    const album = await this.albumModel.findOneAndDelete({ _id: id, userId });
    if (!album) throw new NotFoundException('Album not found');
    await this.fileModel.updateMany({ userId, albumId: id }, { $set: { albumId: null } });
  }
}

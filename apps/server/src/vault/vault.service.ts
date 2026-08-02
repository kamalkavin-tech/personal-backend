import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VAULT_TYPES, VaultType, VaultEntryInput, FolderInput } from '@vaultx/shared';
import { VaultEntry } from './schemas/vault-entry.schema';
import { Folder } from './schemas/folder.schema';
import { AuditService } from '../audit/audit.service';

export interface VaultListQuery {
  type?: VaultType;
  folderId?: string;
  archived?: boolean;
  trash?: boolean;
  favorite?: boolean;
  pinned?: boolean;
  tag?: string;
  limit?: number;
}

@Injectable()
export class VaultService {
  constructor(
    @InjectModel(VaultEntry.name) private readonly entryModel: Model<VaultEntry>,
    @InjectModel(Folder.name) private readonly folderModel: Model<Folder>,
    private readonly audit: AuditService,
  ) {}

  private ownedFilter(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Entry not found');
    return { _id: id, userId };
  }

  async list(userId: string, q: VaultListQuery): Promise<VaultEntry[]> {
    const filter: Record<string, unknown> = { userId };
    if (q.trash) {
      filter.deletedAt = { $ne: null };
    } else {
      filter.deletedAt = null;
      if (q.type && VAULT_TYPES.includes(q.type)) filter.type = q.type;
      if (q.folderId) filter.folderId = q.folderId;
      if (q.archived) filter.archived = true;
      else filter.archived = false;
      if (q.favorite) filter.favorite = true;
      if (q.pinned) filter.pinned = true;
      if (q.tag) filter.tags = q.tag;
    }
    const limit = Math.min(q.limit ?? 500, 1000);
    return this.entryModel
      .find(filter)
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(limit)
      .lean();
  }

  async get(userId: string, id: string): Promise<VaultEntry> {
    const entry = await this.entryModel.findOne(this.ownedFilter(userId, id)).lean();
    if (!entry) throw new NotFoundException('Entry not found');
    return entry;
  }

  async create(userId: string, dto: VaultEntryInput): Promise<VaultEntry> {
    const entry = await this.entryModel.create({
      userId,
      type: dto.type,
      encrypted: dto.encrypted,
      iv: dto.iv,
      title: dto.title,
      folderId: dto.folderId ?? null,
      tags: dto.tags ?? [],
      favorite: dto.favorite ?? false,
      pinned: dto.pinned ?? false,
      archived: dto.archived ?? false,
    });
    await this.audit.log(userId, `vault.${dto.type}.created`);
    return entry.toObject();
  }

  async update(userId: string, id: string, patch: Partial<VaultEntryInput>): Promise<VaultEntry> {
    const allowed = ['encrypted', 'iv', 'title', 'folderId', 'tags', 'favorite', 'pinned', 'archived'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in patch && patch[key as keyof VaultEntryInput] !== undefined) {
        update[key] = patch[key as keyof VaultEntryInput];
      }
    }
    const entry = await this.entryModel.findOneAndUpdate(this.ownedFilter(userId, id), { $set: update }, { new: true }).lean();
    if (!entry) throw new NotFoundException('Entry not found');
    await this.audit.log(userId, 'vault.updated');
    return entry;
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const entry = await this.entryModel.findOneAndUpdate(this.ownedFilter(userId, id), { $set: { deletedAt: new Date() } });
    if (!entry) throw new NotFoundException('Entry not found');
    await this.audit.log(userId, 'vault.trashed');
  }

  async restore(userId: string, id: string): Promise<VaultEntry> {
    const entry = await this.entryModel.findOneAndUpdate(this.ownedFilter(userId, id), { $set: { deletedAt: null } }, { new: true }).lean();
    if (!entry) throw new NotFoundException('Entry not found');
    return entry;
  }

  async permanentDelete(userId: string, id: string): Promise<void> {
    const entry = await this.entryModel.findOneAndDelete(this.ownedFilter(userId, id));
    if (!entry) throw new NotFoundException('Entry not found');
    await this.audit.log(userId, 'vault.permanently-deleted');
  }

  async emptyTrash(userId: string): Promise<number> {
    const result = await this.entryModel.deleteMany({ userId, deletedAt: { $ne: null } });
    return result.deletedCount ?? 0;
  }

  // ----- Folders -----
  async listFolders(userId: string, type?: VaultType | 'all'): Promise<Folder[]> {
    const filter: Record<string, unknown> = { userId, deletedAt: null };
    if (type) filter.type = type;
    return this.folderModel.find(filter).sort({ name: 1 }).lean();
  }

  async createFolder(userId: string, dto: FolderInput): Promise<Folder> {
    const folder = await this.folderModel.create({ userId, name: dto.name, type: dto.type ?? 'all', color: dto.color ?? '#6366f1' });
    return folder.toObject();
  }

  async updateFolder(userId: string, id: string, patch: Partial<FolderInput>): Promise<Folder> {
    const folder = await this.folderModel.findOneAndUpdate({ _id: id, userId }, { $set: patch }, { new: true }).lean();
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async deleteFolder(userId: string, id: string): Promise<void> {
    const folder = await this.folderModel.findOneAndDelete({ _id: id, userId });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.entryModel.updateMany({ userId, folderId: id }, { $set: { folderId: null } });
    await this.audit.log(userId, 'vault.folder.deleted');
  }

  async countByType(userId: string, trash = false): Promise<Record<string, number>> {
    const filter: Record<string, unknown> = { userId, deletedAt: trash ? { $ne: null } : null };
    const agg = await this.entryModel.aggregate([
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const result: Record<string, number> = {};
    for (const row of agg) result[row._id as string] = row.count as number;
    for (const t of VAULT_TYPES) if (!result[t]) result[t] = 0;
    return result;
  }

  async recent(userId: string, limit = 8): Promise<VaultEntry[]> {
    return this.entryModel
      .find({ userId, deletedAt: null, archived: false })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
  }

  async total(userId: string): Promise<number> {
    return this.entryModel.countDocuments({ userId, deletedAt: null });
  }

  async findByIds(userId: string, ids: string[]): Promise<VaultEntry[]> {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    return this.entryModel.find({ _id: { $in: valid }, userId }).lean();
  }
}

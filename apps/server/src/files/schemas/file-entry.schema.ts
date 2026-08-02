import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { FILE_KINDS, FileKind } from '@vaultx/shared';

export type FileEntryDocument = HydratedDocument<FileEntry>;

@Schema({ timestamps: true, collection: 'fileentries' })
export class FileEntry {
  _id?: unknown;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  fsId: string;

  @Prop({ type: String, enum: FILE_KINDS })
  kind: FileKind;

  @Prop({ type: String })
  mime?: string;

  @Prop({ type: Number, default: 0 })
  size: number;

  /** AES-encrypted original filename (client side). */
  @Prop({ type: String, required: true })
  encryptedName: string;

  @Prop({ type: String, required: true })
  iv: string;

  /** IV used for the AES-GCM encryption of the file content itself. */
  @Prop({ type: String, required: true })
  contentIv: string;

  @Prop({ type: String, default: null })
  albumId?: string | null;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Boolean, default: false })
  favorite: boolean;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const FileEntrySchema = SchemaFactory.createForClass(FileEntry);
FileEntrySchema.index({ userId: 1, kind: 1, deletedAt: 1 });
FileEntrySchema.index({ userId: 1, createdAt: -1 });

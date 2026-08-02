import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { VAULT_TYPES, VaultType } from '@vaultx/shared';

export type VaultEntryDocument = HydratedDocument<VaultEntry>;

@Schema({ timestamps: true, collection: 'vaultentries' })
export class VaultEntry {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: VAULT_TYPES })
  type: VaultType;

  @Prop({ required: true })
  encrypted: string;

  @Prop({ required: true })
  iv: string;

  /** AES-encrypted title (client side). Opaque to the server. */
  @Prop({ required: true })
  title: string;

  @Prop({ type: String, default: null })
  folderId?: string | null;

  @Prop({ default: [] })
  tags: string[];

  @Prop({ default: false })
  favorite: boolean;

  @Prop({ default: false })
  pinned: boolean;

  @Prop({ default: false })
  archived: boolean;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const VaultEntrySchema = SchemaFactory.createForClass(VaultEntry);
VaultEntrySchema.index({ userId: 1, type: 1, deletedAt: 1 });
VaultEntrySchema.index({ userId: 1, updatedAt: -1 });

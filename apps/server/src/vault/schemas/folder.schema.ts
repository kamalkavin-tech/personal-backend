import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { VAULT_TYPES, VaultType } from '@vaultx/shared';

export type FolderDocument = HydratedDocument<Folder>;

@Schema({ timestamps: true, collection: 'folders' })
export class Folder {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, enum: [...VAULT_TYPES, 'all'], default: 'all' })
  type: VaultType | 'all';

  @Prop({ type: String, default: '#6366f1' })
  color: string;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const FolderSchema = SchemaFactory.createForClass(Folder);

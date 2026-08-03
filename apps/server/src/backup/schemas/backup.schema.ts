import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BackupDocument = HydratedDocument<Backup>;

@Schema({ timestamps: true, collection: 'backups' })
export class Backup {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String })
  fsId?: string;

  @Prop({ type: String, required: true })
  filename: string;

  @Prop({ type: Number, default: 0 })
  size: number;

  @Prop({ type: String, enum: ['auto', 'manual', 'export'], default: 'manual' })
  kind: 'auto' | 'manual' | 'export';

  @Prop({ type: Date, default: null })
  restoredAt?: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const BackupSchema = SchemaFactory.createForClass(Backup);
BackupSchema.index({ userId: 1, createdAt: -1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BackupDocument = HydratedDocument<Backup>;

@Schema({ timestamps: true, collection: 'backups' })
export class Backup {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  fsId?: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ default: 0 })
  size: number;

  @Prop({ enum: ['auto', 'manual', 'export'], default: 'manual' })
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

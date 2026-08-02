import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: true, collection: 'auditlogs' })
export class AuditLog {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  action: string;

  @Prop()
  ip?: string;

  @Prop()
  ua?: string;

  @Prop()
  meta?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ userId: 1, createdAt: -1 });

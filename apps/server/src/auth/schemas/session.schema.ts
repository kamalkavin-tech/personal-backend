import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  deviceId?: string;

  @Prop()
  deviceName?: string;

  @Prop({ required: true, unique: true })
  tokenHash: string;

  @Prop()
  ua?: string;

  @Prop()
  ip?: string;

  @Prop({ default: false })
  trusted: boolean;

  @Prop({ default: false })
  current?: boolean;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: Date.now })
  lastSeenAt: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ userId: 1, createdAt: -1 });

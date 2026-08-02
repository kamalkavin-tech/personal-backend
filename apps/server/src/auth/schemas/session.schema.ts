import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String })
  deviceId?: string;

  @Prop({ type: String })
  deviceName?: string;

  @Prop({ type: String, required: true, unique: true })
  tokenHash: string;

  @Prop({ type: String })
  ua?: string;

  @Prop({ type: String })
  ip?: string;

  @Prop({ type: Boolean, default: false })
  trusted: boolean;

  @Prop({ type: Boolean, default: false })
  current?: boolean;

  @Prop({ type: Date, required: true })
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

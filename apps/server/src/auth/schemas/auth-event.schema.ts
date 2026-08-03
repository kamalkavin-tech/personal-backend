import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthEventDocument = HydratedDocument<AuthEvent>;

@Schema({ timestamps: true, collection: 'authevents' })
export class AuthEvent {
  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String, required: true })
  type: 'login' | 'register' | 'failed' | 'logout' | '2fa';

  @Prop({ type: String })
  ip?: string;

  @Prop({ type: String })
  ua?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const AuthEventSchema = SchemaFactory.createForClass(AuthEvent);
AuthEventSchema.index({ userId: 1, createdAt: -1 });
AuthEventSchema.index({ email: 1, createdAt: -1 });

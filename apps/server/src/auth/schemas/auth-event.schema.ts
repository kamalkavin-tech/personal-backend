import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthEventDocument = HydratedDocument<AuthEvent>;

@Schema({ timestamps: true, collection: 'authevents' })
export class AuthEvent {
  @Prop()
  userId?: string;

  @Prop()
  email?: string;

  @Prop({ required: true })
  type: 'login' | 'register' | 'failed' | 'logout' | '2fa';

  @Prop()
  ip?: string;

  @Prop()
  ua?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const AuthEventSchema = SchemaFactory.createForClass(AuthEvent);
AuthEventSchema.index({ userId: 1, createdAt: -1 });
AuthEventSchema.index({ email: 1, createdAt: -1 });

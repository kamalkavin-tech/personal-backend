import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: String, required: true })
  hashedAuthKey: string;

  @Prop({ type: String, required: true })
  kekSalt: string;

  @Prop({ type: String, required: true })
  authSalt: string;

  @Prop({ type: Number, required: true })
  iterations: number;

  @Prop({ type: String, required: true })
  wrappedDEK: string;

  @Prop({
    type: {
      enabled: { type: Boolean, default: false },
      pendingSecretEnc: String,
      secretEnc: String,
      backupCodes: [String],
    },
    default: { enabled: false },
  })
  twoFactor: {
    enabled: boolean;
    pendingSecretEnc?: string;
    secretEnc?: string;
    backupCodes?: string[];
  };

  @Prop({
    type: {
      theme: { type: String, default: 'system' },
      language: { type: String, default: 'en' },
      notifications: { type: Boolean, default: true },
    },
    default: {},
  })
  settings: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
  };

  @Prop({ type: String })
  resetTokenHash?: string;

  @Prop({ type: Date })
  resetTokenExpires?: Date;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

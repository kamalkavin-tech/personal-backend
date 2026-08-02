import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop()
  name?: string;

  @Prop({ required: true })
  hashedAuthKey: string;

  @Prop({ required: true })
  kekSalt: string;

  @Prop({ required: true })
  authSalt: string;

  @Prop({ required: true })
  iterations: number;

  @Prop({ required: true })
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

  @Prop()
  resetTokenHash?: string;

  @Prop()
  resetTokenExpires?: Date;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

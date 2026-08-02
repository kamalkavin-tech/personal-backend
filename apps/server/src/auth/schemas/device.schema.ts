import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeviceDocument = HydratedDocument<Device>;

@Schema({ timestamps: true, collection: 'devices' })
export class Device {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  platform?: string;

  @Prop({ required: true, unique: true })
  fingerprint: string;

  @Prop({ default: false })
  trusted: boolean;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: Date, default: Date.now })
  lastSeenAt: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
DeviceSchema.index({ userId: 1, lastSeenAt: -1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeviceDocument = HydratedDocument<Device>;

@Schema({ timestamps: true, collection: 'devices' })
export class Device {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  platform?: string;

  @Prop({ type: String, required: true, unique: true })
  fingerprint: string;

  @Prop({ type: Boolean, default: false })
  trusted: boolean;

  @Prop({ type: Boolean, default: false })
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

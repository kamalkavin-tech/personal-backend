import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private readonly model: Model<Notification>) {}

  async notify(userId: string, title: string, body: string, type = 'info'): Promise<void> {
    try {
      await this.model.create({ userId, title, body, type });
    } catch {
      /* non fatal */
    }
  }

  async list(userId: string, limit = 50): Promise<Notification[]> {
    return this.model.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.model.updateOne({ _id: id, userId }, { $set: { read: true } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.model.updateMany({ userId }, { $set: { read: true } });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, read: false });
  }
}

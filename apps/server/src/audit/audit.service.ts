import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>) {}

  async log(userId: string, action: string, ctx: { ip?: string; ua?: string; meta?: unknown } = {}): Promise<void> {
    await this.model.create({
      userId,
      action,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: ctx.meta ? JSON.stringify(ctx.meta) : undefined,
    });
  }

  async list(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

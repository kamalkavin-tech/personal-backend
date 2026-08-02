import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/user.schema';
import { Device } from '../auth/schemas/device.schema';
import { Session } from '../auth/schemas/session.schema';
import { AuthEvent } from '../auth/schemas/auth-event.schema';
import { AuditLog } from '../audit/audit-log.schema';
import { VaultEntry } from '../vault/schemas/vault-entry.schema';
import { AuditService } from '../audit/audit.service';

export interface SecurityOverview {
  score: number;
  twoFactorEnabled: boolean;
  activeSessions: number;
  trustedDevices: number;
  totalLogins: number;
  failedLogins24h: number;
  passwordEntryCount: number;
  recentLogins: AuthEvent[];
  auditLogs: AuditLog[];
}

@Injectable()
export class SecurityService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(AuthEvent.name) private readonly authEventModel: Model<AuthEvent>,
    @InjectModel(VaultEntry.name) private readonly vaultModel: Model<VaultEntry>,
    private readonly audit: AuditService,
  ) {}

  async overview(userId: string): Promise<SecurityOverview> {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const [user, activeSessions, trustedDevices, totalLogins, failedLogins24h, passwordEntryCount, recentLogins, auditLogs] = await Promise.all([
      this.userModel.findById(userId).lean(),
      this.sessionModel.countDocuments({ userId }),
      this.deviceModel.countDocuments({ userId, trusted: true }),
      this.authEventModel.countDocuments({ userId, type: { $in: ['login', '2fa'] } }),
      this.authEventModel.countDocuments({ userId, type: 'failed', createdAt: { $gte: since } }),
      this.vaultModel.countDocuments({ userId, type: 'password', deletedAt: null }),
      this.authEventModel.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
      this.audit.list(userId, 25),
    ]);

    let score = 40;
    if (user?.twoFactor?.enabled) score += 30;
    if (activeSessions <= 3) score += 10;
    if (trustedDevices <= 2) score += 10;
    if (failedLogins24h === 0) score += 10;
    score -= Math.min(failedLogins24h * 2, 20);
    score = Math.max(10, Math.min(100, score));

    return {
      score,
      twoFactorEnabled: user?.twoFactor?.enabled ?? false,
      activeSessions,
      trustedDevices,
      totalLogins,
      failedLogins24h,
      passwordEntryCount,
      recentLogins,
      auditLogs,
    };
  }

  async history(userId: string, limit = 50): Promise<AuthEvent[]> {
    return this.authEventModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  }
}

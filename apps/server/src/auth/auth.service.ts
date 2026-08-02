import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { authenticator } from 'otplib';
import { RegisterInput, LoginInput, Verify2faInput, ChangePasswordInput, Setup2faInput, Verify2faSetupInput } from '@vaultx/shared';
import { CryptoService } from '../encryption/crypto.service';
import { TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../redis/redis.module';
import { CleanupService } from '../data/cleanup.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from './schemas/user.schema';
import { Device, DeviceDocument } from './schemas/device.schema';
import { Session } from './schemas/session.schema';
import { AuthEvent } from './schemas/auth-event.schema';

export interface AuthContext {
  ip?: string;
  ua?: string;
}

export interface LoginResult {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
  requiresTwoFactor: boolean;
  pendingEmail?: string;
  pending?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
    @InjectModel(AuthEvent.name) private readonly authEventModel: Model<AuthEvent>,
    private readonly crypto: CryptoService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
    private readonly cleanup: CleanupService,
    private readonly notifications: NotificationsService,
  ) {}

  private sanitize(user: UserDocument) {
    return {
      _id: String(user._id),
      email: user.email,
      name: user.name,
      kekSalt: user.kekSalt,
      authSalt: user.authSalt,
      iterations: user.iterations,
      wrappedDEK: user.wrappedDEK,
      twoFactor: { enabled: user.twoFactor?.enabled ?? false },
      settings: user.settings ?? { theme: 'system', language: 'en', notifications: true },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async recordEvent(event: Partial<AuthEvent>, ctx: AuthContext): Promise<void> {
    try {
      await this.authEventModel.create({ ...event, ip: event.ip ?? ctx.ip, ua: event.ua ?? ctx.ua });
    } catch {
      /* non fatal */
    }
  }

  private async upsertDevice(userId: string, dto: { deviceId?: string; deviceName?: string; platform?: string }, trusted = false): Promise<DeviceDocument | null> {
    if (!dto.deviceId) return null;
    let device: DeviceDocument | null = await this.deviceModel.findOne({ fingerprint: dto.deviceId });
    if (device) {
      device.name = dto.deviceName ?? device.name;
      device.platform = dto.platform ?? device.platform;
      device.lastSeenAt = new Date();
      if (trusted) device.trusted = true;
      device.verified = true;
      await device.save();
    } else {
      device = await this.deviceModel.create({
        userId,
        name: dto.deviceName ?? 'Unknown device',
        platform: dto.platform,
        fingerprint: dto.deviceId,
        trusted,
        verified: true,
      });
      await this.notifications.notify(
        userId,
        'New device signed in',
        `${dto.deviceName ?? 'A new device'} just signed in to your vault. If this wasn't you, review your devices in the Security Center.`,
        'security',
      );
    }
    return device;
  }

  private async createSession(
    user: UserDocument,
    ctx: AuthContext,
    device?: DeviceDocument | null,
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const refreshToken = this.tokens.generateRefreshToken();
    const session = await this.sessionModel.create({
      userId: String(user._id),
      deviceId: device ? String(device._id) : undefined,
      deviceName: device?.name,
      tokenHash: this.crypto.sha256(refreshToken),
      ua: ctx.ua,
      ip: ctx.ip,
      trusted: device?.trusted ?? false,
      current: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });
    const accessToken = this.tokens.signAccess({
      sub: String(user._id),
      email: user.email,
      deviceId: device ? String(device._id) : undefined,
      sessionId: String(session._id),
    });
    return { accessToken, refreshToken, sessionId: String(session._id) };
  }

  async register(dto: RegisterInput, ctx: AuthContext): Promise<LoginResult> {
    const email = dto.email.toLowerCase();
    const existing = await this.userModel.findOne({ email });
    if (existing) throw new ConflictException('An account with this email already exists');

    const hashedAuthKey = await this.crypto.hashSecret(dto.authKey);
    const user = await this.userModel.create({
      email,
      name: dto.name,
      hashedAuthKey,
      kekSalt: dto.kekSalt,
      authSalt: dto.authSalt,
      iterations: dto.iterations,
      wrappedDEK: dto.wrappedDEK,
      settings: { theme: 'system', language: 'en', notifications: true },
    });

    await this.recordEvent({ userId: String(user._id), email, type: 'register' }, ctx);
    await this.audit.log(String(user._id), 'account.registered', ctx);
    await this.cache.del(`bf:${email}`);

    const device = await this.upsertDevice(String(user._id), dto);
    const session = await this.createSession(user, ctx, device);
    await this.audit.log(String(user._id), 'auth.login', ctx);
    return { accessToken: session.accessToken, refreshToken: session.refreshToken, user: this.sanitize(user), requiresTwoFactor: false };
  }

  private async checkBruteForce(email: string): Promise<void> {
    const count = (await this.cache.get<number>(`bf:${email}`)) ?? 0;
    if (count >= 5) throw new ForbiddenException('Too many failed attempts. Try again in 15 minutes.');
  }

  private async recordFailed(email: string): Promise<void> {
    const count = (await this.cache.get<number>(`bf:${email}`)) ?? 0;
    await this.cache.set(`bf:${email}`, count + 1, 900);
  }

  async prepareLogin(email: string): Promise<{ kekSalt: string; authSalt: string; iterations: number; twoFactorEnabled: boolean }> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) throw new UnauthorizedException('No account found with this email');
    return {
      kekSalt: user.kekSalt,
      authSalt: user.authSalt,
      iterations: user.iterations,
      twoFactorEnabled: user.twoFactor?.enabled === true,
    };
  }

  async login(dto: LoginInput, ctx: AuthContext): Promise<LoginResult> {
    const email = dto.email.toLowerCase();
    const user = await this.userModel.findOne({ email });
    if (!user) {
      await this.recordEvent({ email, type: 'failed' }, ctx);
      await this.recordFailed(email);
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.checkBruteForce(email);

    const valid = await this.crypto.verifySecret(user.hashedAuthKey, dto.authKey);
    if (!valid) {
      await this.recordEvent({ userId: String(user._id), email, type: 'failed' }, ctx);
      await this.recordFailed(email);
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.cache.del(`bf:${email}`);
    await this.recordEvent({ userId: String(user._id), email, type: 'login' }, ctx);

    const twoFactorEnabled = user.twoFactor?.enabled === true;

    if (twoFactorEnabled) {
      if (dto.twoFactorCode) {
        const ok = await this.verifyTotpOrBackup(user, dto.twoFactorCode);
        if (!ok) throw new UnauthorizedException('Invalid two-factor code');
        await this.recordEvent({ userId: String(user._id), email, type: '2fa' }, ctx);
        if (dto.rememberDevice) await this.upsertDevice(String(user._id), dto, true);
        const device = await this.upsertDevice(String(user._id), dto);
        const session = await this.createSession(user, ctx, device);
        await this.audit.log(String(user._id), 'auth.login', ctx);
        return { accessToken: session.accessToken, refreshToken: session.refreshToken, user: this.sanitize(user), requiresTwoFactor: false };
      }

      const device = dto.deviceId ? await this.deviceModel.findOne({ fingerprint: dto.deviceId, userId: String(user._id) }) : null;
      if (device?.trusted) {
        const session = await this.createSession(user, ctx, device);
        await this.audit.log(String(user._id), 'auth.login', ctx);
        return { accessToken: session.accessToken, refreshToken: session.refreshToken, user: this.sanitize(user), requiresTwoFactor: false };
      }

      const pending = this.tokens.signPending({ email, nonce: this.crypto.randomToken(16) });
      return { requiresTwoFactor: true, pendingEmail: email, pending };
    }

    const device = await this.upsertDevice(String(user._id), dto);
    const session = await this.createSession(user, ctx, device);
    await this.audit.log(String(user._id), 'auth.login', ctx);
    return { accessToken: session.accessToken, refreshToken: session.refreshToken, user: this.sanitize(user), requiresTwoFactor: false };
  }

  async verify2fa(dto: Verify2faInput, pending: string | undefined, ctx: AuthContext): Promise<LoginResult> {
    if (!pending) throw new UnauthorizedException('Pending login not found');
    const payload = this.tokens.verifyPending<{ email: string }>(pending);
    const email = dto.email.toLowerCase();
    if (payload.email !== email) throw new UnauthorizedException('Pending login mismatch');

    const user = await this.userModel.findOne({ email });
    if (!user || user.twoFactor?.enabled !== true) throw new UnauthorizedException('Two-factor not enabled');

    const ok = await this.verifyTotpOrBackup(user, dto.twoFactorCode);
    if (!ok) throw new UnauthorizedException('Invalid two-factor code');

    await this.recordEvent({ userId: String(user._id), email, type: '2fa' }, ctx);
    await this.audit.log(String(user._id), 'auth.login', ctx);
    if (dto.rememberDevice) await this.upsertDevice(String(user._id), dto, true);
    const device = await this.upsertDevice(String(user._id), dto);
    const session = await this.createSession(user, ctx, device);
    return { accessToken: session.accessToken, refreshToken: session.refreshToken, user: this.sanitize(user), requiresTwoFactor: false };
  }

  private async verifyTotpOrBackup(user: UserDocument, code: string): Promise<boolean> {
    if (user.twoFactor?.secretEnc) {
      const blob = JSON.parse(user.twoFactor.secretEnc) as { data: string; iv: string };
      const secret = this.crypto.decrypt(blob);
      const valid = authenticator.check(code, secret);
      if (valid) return true;
    }
    const backupCodes = user.twoFactor?.backupCodes ?? [];
    for (const hash of backupCodes) {
      if (await this.crypto.verifySecret(hash, code)) {
        user.twoFactor!.backupCodes = backupCodes.filter((h) => h !== hash);
        await user.save();
        return true;
      }
    }
    return false;
  }

  async refresh(refreshToken: string | undefined): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) throw new UnauthorizedException('No refresh token');
    const hash = this.crypto.sha256(refreshToken);
    const session = await this.sessionModel.findOne({ tokenHash: hash });
    if (!session || session.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Session expired');

    const newRefresh = this.tokens.generateRefreshToken();
    session.tokenHash = this.crypto.sha256(newRefresh);
    session.lastSeenAt = new Date();
    await session.save();

    const user = await this.userModel.findById(session.userId);
    if (!user) throw new UnauthorizedException('User not found');

    const accessToken = this.tokens.signAccess({
      sub: String(user._id),
      email: user.email,
      deviceId: session.deviceId,
      sessionId: String(session._id),
    });
    return { accessToken, refreshToken: newRefresh };
  }

  async logout(refreshToken: string | undefined, ctx: AuthContext): Promise<void> {
    if (!refreshToken) return;
    const hash = this.crypto.sha256(refreshToken);
    const session = await this.sessionModel.findOneAndDelete({ tokenHash: hash });
    if (session) await this.audit.log(session.userId, 'auth.logout', ctx);
  }

  async me(userId: string): Promise<unknown | null> {
    const user = await this.userModel.findById(userId);
    return user ? this.sanitize(user) : null;
  }

  async updateProfile(userId: string, dto: { name?: string }): Promise<unknown> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (dto.name !== undefined) user.name = dto.name.trim().slice(0, 80);
    await user.save();
    await this.audit.log(userId, 'profile.updated');
    return this.sanitize(user);
  }

  async listDevices(userId: string): Promise<Device[]> {
    return this.deviceModel.find({ userId }).sort({ lastSeenAt: -1 }).lean();
  }

  async setDeviceTrusted(userId: string, deviceId: string, trusted: boolean): Promise<Device> {
    const device = await this.deviceModel.findOne({ _id: deviceId, userId });
    if (!device) throw new NotFoundException('Device not found');
    device.trusted = trusted;
    await device.save();
    return device;
  }

  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.deviceModel.findOneAndDelete({ _id: deviceId, userId });
    if (!device) throw new NotFoundException('Device not found');
    await this.sessionModel.deleteMany({ userId, deviceId });
  }

  async listSessions(userId: string, currentSessionId?: string): Promise<unknown[]> {
    const sessions = await this.sessionModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return sessions.map((s) => ({
      _id: String(s._id),
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      ua: s.ua,
      ip: s.ip,
      trusted: s.trusted,
      current: currentSessionId ? String(s._id) === currentSessionId : false,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    if (!Types.ObjectId.isValid(sessionId)) throw new NotFoundException('Session not found');
    const session = await this.sessionModel.findOneAndDelete({ _id: sessionId, userId });
    if (!session) throw new NotFoundException('Session not found');
  }

  async setup2fa(userId: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'VaultX', secret);
    const qrDataUrl = await import('qrcode').then((qrcode) => qrcode.toDataURL(otpauthUrl));
    user.twoFactor!.pendingSecretEnc = JSON.stringify(this.crypto.encrypt(secret));
    user.markModified('twoFactor');
    await user.save();
    return { secret, otpauthUrl, qrDataUrl };
  }

  async verify2faSetup(userId: string, dto: Verify2faSetupInput): Promise<{ backupCodes: string[] }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const pending = user.twoFactor?.pendingSecretEnc;
    if (!pending) throw new BadRequestException('No pending 2FA setup. Start setup first.');
    const blob = JSON.parse(pending) as { data: string; iv: string };
    const secret = this.crypto.decrypt(blob);
    if (secret !== dto.secret || !authenticator.check(dto.code, secret)) {
      throw new BadRequestException('Invalid verification code');
    }
    const codes = Array.from({ length: 10 }, () => this.crypto.randomToken(5).replace(/-/g, '').slice(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, 'X'));
    const hashed = await Promise.all(codes.map((c) => this.crypto.hashSecret(c)));
    user.twoFactor!.enabled = true;
    user.twoFactor!.secretEnc = JSON.stringify(this.crypto.encrypt(secret));
    user.twoFactor!.pendingSecretEnc = undefined;
    user.twoFactor!.backupCodes = hashed;
    user.markModified('twoFactor');
    await user.save();
    await this.audit.log(userId, 'security.2fa.enabled');
    return { backupCodes: codes };
  }

  async disable2fa(userId: string, code: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user || user.twoFactor?.enabled !== true) throw new BadRequestException('2FA is not enabled');
    const ok = await this.verifyTotpOrBackup(user, code);
    if (!ok) throw new BadRequestException('Invalid code');
    user.twoFactor!.enabled = false;
    user.twoFactor!.secretEnc = undefined;
    user.twoFactor!.backupCodes = [];
    user.markModified('twoFactor');
    await user.save();
    await this.audit.log(userId, 'security.2fa.disabled');
  }

  async changePassword(userId: string, dto: ChangePasswordInput, ctx: AuthContext): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const valid = await this.crypto.verifySecret(user.hashedAuthKey, dto.currentAuthKey);
    if (!valid) throw new UnauthorizedException('Current master password is incorrect');
    user.hashedAuthKey = await this.crypto.hashSecret(dto.newAuthKey);
    user.wrappedDEK = dto.newWrappedDEK;
    user.kekSalt = dto.newKekSalt;
    user.authSalt = dto.newAuthSalt;
    user.iterations = dto.newIterations;
    await user.save();
    await this.audit.log(userId, 'auth.password.changed', ctx);
  }

  async forgotPassword(email: string): Promise<{ token?: string }> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) return {};
    const token = this.crypto.randomToken(32);
    user.resetTokenHash = this.crypto.sha256(token);
    user.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    const isProd = process.env.NODE_ENV === 'production';
    return { token: isProd ? undefined : token };
  }

  async resetPassword(dto: { token: string; newAuthKey: string; newKekSalt: string; newAuthSalt: string; newIterations: number; newWrappedDEK: string }, ctx: AuthContext): Promise<void> {
    const user = await this.userModel.findOne({ resetTokenHash: this.crypto.sha256(dto.token) });
    if (!user || !user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now()) {
      throw new BadRequestException('Reset token is invalid or expired');
    }
    user.hashedAuthKey = await this.crypto.hashSecret(dto.newAuthKey);
    user.wrappedDEK = dto.newWrappedDEK;
    user.kekSalt = dto.newKekSalt;
    user.authSalt = dto.newAuthSalt;
    user.iterations = dto.newIterations;
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    await this.sessionModel.deleteMany({ userId: String(user._id) });
    await this.cleanup.purgeUserData(String(user._id));
    await this.audit.log(String(user._id), 'auth.password.reset', ctx);
  }

  async deleteAccount(userId: string, authKey: string, ctx: AuthContext): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const valid = await this.crypto.verifySecret(user.hashedAuthKey, authKey);
    if (!valid) throw new UnauthorizedException('Master password is incorrect');
    await this.cleanup.deleteAccount(userId);
    await this.audit.log(userId, 'account.deleted', ctx);
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { JwtUser } from '../common/decorators';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get accessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret';
  }

  private get refreshTtlSeconds(): number {
    return Number(this.config.get('JWT_REFRESH_TTL') ?? 2592000);
  }

  signAccess(payload: JwtUser): string {
    const ttl = Number(this.config.get('JWT_ACCESS_TTL') ?? 900);
    return this.jwt.sign(payload, { secret: this.accessSecret, expiresIn: ttl });
  }

  signPending(payload: { email: string; nonce: string }): string {
    return this.jwt.sign(payload, { secret: this.accessSecret, expiresIn: 300 });
  }

  verifyAccess(token: string): JwtUser {
    try {
      return this.jwt.verify<JwtUser>(token, { secret: this.accessSecret });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  verifyPending<T extends { email: string }>(token: string): T {
    try {
      return this.jwt.verify<T>(token, { secret: this.accessSecret });
    } catch {
      throw new UnauthorizedException('Pending login expired, please log in again');
    }
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  refreshCookieOptions(): {
    httpOnly: boolean;
    sameSite: 'none';
    secure: boolean;
    path: string;
    maxAge: number;
  } {
    return {
      httpOnly: true,
      sameSite: 'none',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: '/',
      maxAge: this.refreshTtlSeconds * 1000,
    };
  }

  pendingCookieOptions(): {
    httpOnly: boolean;
    sameSite: 'none';
    secure: boolean;
    path: string;
    maxAge: number;
  } {
    return {
      httpOnly: true,
      sameSite: 'none',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: '/',
      maxAge: 300_000,
    };
  }

  clearCookieOptions(): { sameSite: 'none'; secure: boolean; path: string } {
    return {
      sameSite: 'none',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: '/',
    };
  }
}

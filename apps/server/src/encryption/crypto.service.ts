import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

export interface EncryptedBlob {
  data: string;
  iv: string;
}

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const hex = config.get<string>('SERVER_KEY') ?? '0'.repeat(64);
    this.key = Buffer.from(hex, 'hex');
    if (this.key.length !== 32) this.key = crypto.createHash('sha256').update(hex).digest();
  }

  randomBytes(size: number): string {
    return crypto.randomBytes(size).toString('base64url');
  }

  randomToken(size = 32): string {
    return crypto.randomBytes(size).toString('base64url');
  }

  /** AES-256-GCM encrypt with the server key. Returns base64 ciphertext + iv. */
  encrypt(plaintext: string, keyHex?: string): EncryptedBlob {
    const key = keyHex ? Buffer.from(keyHex, 'hex') : this.key;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { data: Buffer.concat([enc, tag]).toString('base64'), iv: iv.toString('base64') };
  }

  decrypt(blob: EncryptedBlob, keyHex?: string): string {
    const key = keyHex ? Buffer.from(keyHex, 'hex') : this.key;
    const raw = Buffer.from(blob.data, 'base64');
    const iv = Buffer.from(blob.iv, 'base64');
    const encrypted = raw.subarray(0, raw.length - 16);
    const tag = raw.subarray(raw.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  async hashSecret(secret: string): Promise<string> {
    return argonHash(secret, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  }

  async verifySecret(hash: string, secret: string): Promise<boolean> {
    try {
      return await argonVerify(hash, secret);
    } catch {
      return false;
    }
  }

  sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

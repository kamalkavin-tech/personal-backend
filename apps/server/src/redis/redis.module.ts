import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

class NoopCache implements Cache {
  async get<T>(key: string): Promise<T | null> {
    return null;
  }
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {}
  async del(key: string): Promise<void> {}
}

@Injectable()
export class CacheService implements Cache, OnModuleDestroy {
  private client: IORedis | null = null;
  private noop = new NoopCache();
  private available = false;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    if (!url) return;
    try {
      this.client = new IORedis(url, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: Number(config.get('REDIS_CONNECT_TIMEOUT_MS') ?? 1000),
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 250, 1000)),
      });
      this.client.on('error', () => {
        this.available = false;
      });
      this.client.on('ready', () => {
        this.available = true;
      });
      this.client.connect().catch(() => undefined);
    } catch {
      this.client = null;
    }
  }

  private ok(): boolean {
    return this.available && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.ok()) return this.noop.get<T>(key);
    const raw = await this.client!.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    if (!this.ok()) return this.noop.set(key, value, ttlSeconds);
    await this.client!.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.ok()) return this.noop.del(key);
    await this.client!.del(key);
  }

  async increment(key: string, ttlSeconds = 60): Promise<number> {
    if (!this.ok()) return 0;
    const n = await this.client!.incr(key);
    if (n === 1) await this.client!.expire(key, ttlSeconds);
    return n;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit().catch(() => undefined);
  }
}

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class RedisModule {}

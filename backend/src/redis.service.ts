import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  get redis() {
    return this.client;
  }

  async onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(url, { lazyConnect: true });
    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }
}

import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../../core/redis.service';

@Controller('')
export class AppController {
  constructor(private readonly redisSvc: RedisService) {}

  @Get('health')
  async health() {
    // simple ping
    let redis = 'down';
    try {
      await this.redisSvc.redis.ping();
      redis = 'up';
    } catch {}
    return { ok: true, redis };
  }

  @Get('platform/status')
  async platformStatus() {
    const r = this.redisSvc.redis;
    const status = (await r.get('platform:status')) || 'online';
    const message = (await r.get('platform:offline_message')) || '';
    const until = await r.get('platform:offline_until');
    return {
      status,
      message,
      offlineUntil: until ? Number(until) : null,
    };
  }
}

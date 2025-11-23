import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../../core/redis.service';
import { Public } from '../../../common/auth/auth.decorators';

type PaymentMethod = 'online' | 'cash';

@Controller('')
export class AppController {
  constructor(private readonly redisSvc: RedisService) {}

  @Get('health')
  @Public()
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
  @Public()
  async platformStatus() {
    const r = this.redisSvc.redis;
    const status = (await r.get('platform:status')) || 'online';
    const message = (await r.get('platform:offline_message')) || '';
    const until = await r.get('platform:offline_until');
    let paymentMethods: PaymentMethod[] = ['online', 'cash'];
    try {
      const raw = await r.get('platform:payment_methods');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) paymentMethods = parsed.filter((m: any) => m === 'online' || m === 'cash');
      }
    } catch {}
    return {
      status,
      message,
      offlineUntil: until ? Number(until) : null,
      paymentMethods,
    };
  }
}

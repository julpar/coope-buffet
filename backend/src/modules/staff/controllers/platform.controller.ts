import { Body, Controller, Get, Put } from '@nestjs/common';
import { Roles } from '../../../common/auth/auth.decorators';
import { RedisService } from '../../core/redis.service';

type PlatformStatus = 'online' | 'soft-offline' | 'hard-offline';

@Controller('staff/platform')
@Roles('ADMIN')
export class StaffPlatformController {
  constructor(private readonly redis: RedisService) {}

  @Get('status')
  async getStatus() {
    const r = this.redis.redis;
    const status = ((await r.get('platform:status')) as PlatformStatus) || 'online';
    const message = (await r.get('platform:offline_message')) || '';
    const until = await r.get('platform:offline_until');
    return {
      status,
      message,
      offlineUntil: until ? Number(until) : null,
    };
  }

  @Put('status')
  async setStatus(
    @Body()
    body: {
      status: PlatformStatus;
      message?: string;
      offlineUntil?: number | null;
    },
  ) {
    const r = this.redis.redis;
    const status: PlatformStatus = ['online', 'soft-offline', 'hard-offline'].includes(body?.status as any)
      ? (body.status as PlatformStatus)
      : 'online';
    const msg = (body?.message || '').trim();
    const untilRaw = body?.offlineUntil;
    const until = typeof untilRaw === 'number' && Number.isFinite(untilRaw) && untilRaw > 0 ? Math.floor(untilRaw) : null;

    await r.set('platform:status', status);
    await r.set('platform:offline_message', msg);
    if (until) await r.set('platform:offline_until', String(until));
    else await r.del('platform:offline_until');

    return { ok: true, status, message: msg, offlineUntil: until };
  }
}

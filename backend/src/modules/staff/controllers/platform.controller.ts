import { Body, Controller, Get, Put, BadRequestException } from '@nestjs/common';
import { Roles } from '../../../common/auth/auth.decorators';
import { RedisService } from '../../core/redis.service';

type PlatformStatus = 'online' | 'soft-offline' | 'hard-offline';
type PaymentMethod = 'online' | 'cash';

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
    let paymentMethods: PaymentMethod[] = ['online', 'cash'];
    try {
      const raw = await r.get('platform:payment_methods');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          paymentMethods = parsed.filter((m) => m === 'online' || m === 'cash');
        }
      }
    } catch {}
    return {
      status,
      message,
      offlineUntil: until ? Number(until) : null,
      paymentMethods,
    };
  }

  @Put('status')
  async setStatus(
    @Body()
    body: {
      status: PlatformStatus;
      message?: string;
      offlineUntil?: number | null;
      paymentMethods?: PaymentMethod[];
    },
  ) {
    const r = this.redis.redis;
    const status: PlatformStatus = ['online', 'soft-offline', 'hard-offline'].includes(body?.status as any)
      ? (body.status as PlatformStatus)
      : 'online';
    const msg = (body?.message || '').trim();
    const untilRaw = body?.offlineUntil;
    const until = typeof untilRaw === 'number' && Number.isFinite(untilRaw) && untilRaw > 0 ? Math.floor(untilRaw) : null;

    // Validate and normalize payment methods
    const provided = Array.isArray(body?.paymentMethods) ? body?.paymentMethods : undefined;
    let paymentMethods: PaymentMethod[] | undefined = provided
      ? provided.filter((m): m is PaymentMethod => m === 'online' || m === 'cash')
      : undefined;
    // If not provided, keep existing stored value (or default to both)
    if (!paymentMethods) {
      try {
        const raw = await r.get('platform:payment_methods');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) paymentMethods = parsed.filter((m: any) => m === 'online' || m === 'cash');
        }
      } catch {}
    }
    if (!paymentMethods || paymentMethods.length === 0) {
      paymentMethods = ['online', 'cash'];
    }
    // Business rule: when platform is online, at least one payment method must be enabled
    if (status === 'online' && paymentMethods.length === 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Seleccione al menos un método de pago cuando la plataforma está Online.' });
    }

    await r.set('platform:status', status);
    await r.set('platform:offline_message', msg);
    if (until) await r.set('platform:offline_until', String(until));
    else await r.del('platform:offline_until');
    try { await r.set('platform:payment_methods', JSON.stringify(paymentMethods)); } catch {}

    return { ok: true, status, message: msg, offlineUntil: until, paymentMethods };
  }
}

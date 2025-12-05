import { Body, Controller, Get, Put, BadRequestException } from '@nestjs/common';
import { Roles } from '../../../common/auth/auth.decorators';
import { RedisService } from '../../core/redis.service';
import { MpPaymentType, MP_DEFAULT_ALLOWED_TYPES } from '../../payments/mp.types';

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
    let mpAllowedPaymentTypes: MpPaymentType[] = [...MP_DEFAULT_ALLOWED_TYPES];
    try {
      const raw = await r.get('platform:payment_methods');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          paymentMethods = parsed.filter((m) => m === 'online' || m === 'cash');
        }
      }
    } catch { /* no-op */ void 0; }
    try {
      const rawTypes = await r.get('platform:mp_allowed_types');
      if (rawTypes) {
        const parsed = JSON.parse(rawTypes);
        if (Array.isArray(parsed)) {
          const set = new Set<string>(MP_DEFAULT_ALLOWED_TYPES as unknown as string[]);
          const filtered = parsed
            .map((v: unknown) => (typeof v === 'string' ? v.trim() : ''))
            .filter((s: string) => !!s && set.has(s));
          if (filtered.length > 0) {
            if (!filtered.includes('account_money')) filtered.unshift('account_money');
            mpAllowedPaymentTypes = Array.from(new Set(filtered)) as MpPaymentType[];
          }
        }
      }
    } catch { /* no-op */ void 0; }
    return {
      status,
      message,
      offlineUntil: until ? Number(until) : null,
      paymentMethods,
      mpAllowedPaymentTypes,
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
      mpAllowedPaymentTypes?: MpPaymentType[];
    },
  ) {
    const r = this.redis.redis;
    const status: PlatformStatus = ((): PlatformStatus => {
      const s = body?.status;
      return s === 'online' || s === 'soft-offline' || s === 'hard-offline' ? s : 'online';
    })();
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
          if (Array.isArray(parsed)) paymentMethods = parsed.filter((m): m is PaymentMethod => m === 'online' || m === 'cash');
        }
      } catch { /* no-op */ void 0; }
    }
    if (!paymentMethods || paymentMethods.length === 0) {
      paymentMethods = ['online', 'cash'];
    }
    // Business rule: when platform is online, at least one payment method must be enabled
    if (status === 'online' && paymentMethods.length === 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Seleccione al menos un método de pago cuando la plataforma está Online.' });
    }

    // Normalize MP allowed payment types (type-level, fixed set)
    let mpAllowedPaymentTypes: MpPaymentType[] | undefined = undefined;
    if (Array.isArray(body?.mpAllowedPaymentTypes)) {
      const set = new Set<string>(MP_DEFAULT_ALLOWED_TYPES as unknown as string[]);
      const filtered = body.mpAllowedPaymentTypes
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((s): s is MpPaymentType => !!s && set.has(s));
      const withAccount = Array.from(new Set(['account_money', ...filtered]));
      mpAllowedPaymentTypes = (withAccount.length > 0 ? (withAccount as MpPaymentType[]) : ([...MP_DEFAULT_ALLOWED_TYPES] as MpPaymentType[])) as MpPaymentType[];
    }

    await r.set('platform:status', status);
    await r.set('platform:offline_message', msg);
    if (until) await r.set('platform:offline_until', String(until));
    else await r.del('platform:offline_until');
    try { await r.set('platform:payment_methods', JSON.stringify(paymentMethods)); } catch { /* no-op */ void 0; }
    if (mpAllowedPaymentTypes) {
      try { await r.set('platform:mp_allowed_types', JSON.stringify(mpAllowedPaymentTypes)); } catch { /* no-op */ void 0; }
    }

    return { ok: true, status, message: msg, offlineUntil: until, paymentMethods, mpAllowedPaymentTypes: mpAllowedPaymentTypes ?? undefined };
  }
}

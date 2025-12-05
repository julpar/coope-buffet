import { Body, Controller, Post, Logger, Query, BadRequestException } from '@nestjs/common';
import { Public } from '../../../common/auth/auth.decorators';
import { OrdersService } from '../../core/orders.service';
import { MercadoPagoService } from '../../payments/mercadopago.service';
import { MpPaymentType, MP_DEFAULT_ALLOWED_TYPES, isMpPaymentType } from '../../payments/mp.types';
import { RedisService } from '../../core/redis.service';

@Controller('payments/mercadopago')
export class CustomerPaymentsController {
  private readonly logger = new Logger('CustomerPaymentsController');
  constructor(
    private readonly orders: OrdersService,
    private readonly mp: MercadoPagoService,
    private readonly redisSvc: RedisService,
  ) {}

  @Post('preference')
  @Public()
  async createPreference(@Body() body: { orderId: string }) {
    // Validate platform status and allowed payment methods
    const r = this.redisSvc.redis;
    const status = (await r.get('platform:status')) || 'online';
    let methods: Array<'online' | 'cash'> = ['online', 'cash'];
    try {
      const raw = await r.get('platform:payment_methods');
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) methods = parsed.filter((m: unknown): m is 'online' | 'cash' => m === 'online' || m === 'cash');
      }
    } catch { /* no-op */ void 0; }
    if (status !== 'online') {
      throw new BadRequestException({ code: 'PLATFORM_OFFLINE', message: 'La plataforma no está disponible para pagos online.' });
    }
    if (!methods.includes('online')) {
      throw new BadRequestException({ code: 'PAYMENT_METHOD_DISABLED', message: 'El pago online está deshabilitado temporalmente.' });
    }

    const order = await this.orders.get(body.orderId);
    if (!order) throw new Error('order not found');
    if (order.status !== 'pending_payment') throw new Error('order not pending');

    // Build and validate absolute return URLs for MercadoPago
    const rawCustomerBase = String(process.env.SERVICE_URL_WEB_CUSTOMER || '').trim();
    if (!rawCustomerBase) {
      throw new Error('CONFIG_ERROR: Set SERVICE_URL_WEB_CUSTOMER to a full http(s) URL (e.g., https://customer.example.com)');
    }
    const customerBase = rawCustomerBase.replace(/\/$/, '');
    if (!/^https?:\/\//i.test(customerBase)) {
      // Fail fast with a clear configuration error instead of sending an invalid MP request
      throw new Error('CONFIG_ERROR: Set SERVICE_URL_WEB_CUSTOMER to a full http(s) URL (e.g., https://customer.example.com)');
    }

    const rawPublicBase = String(process.env.SERVICE_URL_APP || '').trim();
    if (!rawPublicBase) {
      throw new Error('CONFIG_ERROR: Set SERVICE_URL_APP to a full http(s) URL (e.g., https://api.example.com)');
    }
    const publicBase = rawPublicBase.replace(/\/$/, '');

    // Always include external_reference in return URLs for robustness
    const query = `external_reference=${encodeURIComponent(order.shortCode)}`;
    const successUrl = `${customerBase}/return-mp?${query}`;
    const failureUrl = `${customerBase}/return-mp?${query}`;
    const pendingUrl = `${customerBase}/return-mp?${query}`;
    const notificationUrl = `${publicBase}/v1/payments/mercadopago/webhook`;

    // Show a generic title in MercadoPago instead of the first item's name.
    // MP shows the first item's `title` as the checkout header, so we send a single
    // synthetic item summarizing the whole order and titled with the short code.
    const orderTotal = (order.items || []).reduce(
      (acc, it) => acc + Number(it.unitPrice || 0) * Number(it.qty || 0),
      0,
    );

    // Optional: allowed payment types controlled from staff panel (defaults to the four allowed types)
    let allowedPaymentTypes: MpPaymentType[] = [...MP_DEFAULT_ALLOWED_TYPES];
    try {
      const raw = await r.get('platform:mp_allowed_types');
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          // Accept only the fixed set of allow-able types (default 4) and honor the case of including account_money
          const filtered = parsed
            .map((v: unknown) => (typeof v === 'string' ? v.trim() : ''))
            .filter((s: string): s is string => s.length > 0)
            .filter((s: string): s is MpPaymentType => isMpPaymentType(s));
          const withAccount = Array.from(new Set<MpPaymentType>([MpPaymentType.AccountMoney, ...filtered]));
          if (withAccount.length > 0) {
            allowedPaymentTypes = withAccount;
          }
        }
      }
    } catch { /* no-op */ void 0; }

    const pref = await this.mp.createPreference({
      external_reference: order.shortCode,
      items: [
        {
          title: `Orden ${order.shortCode}`,
          quantity: 1,
          unit_price: orderTotal, // ARS units assumed
        },
      ],
      successUrl,
      failureUrl,
      pendingUrl,
      notificationUrl,
      allowedPaymentTypes,
    });

    this.logger.log(`Created MP preference for order ${order.id} code=${order.shortCode} pref=${pref.id}`);
    return { preferenceId: pref.id, initPoint: pref.init_point };
  }

  // Webhook for asynchronous notifications
  @Post('webhook')
  @Public()
  async webhook(@Body() body: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    // MP may send id in different places
    const paymentId =
      (typeof body?.data === 'object' && body?.data && 'id' in (body.data as object) ? (body.data as { id?: unknown }).id : undefined) ||
      (query?.['data.id'] as unknown) ||
      (query?.id as unknown) ||
      (body?.id as unknown);
    const type = (body?.type as unknown) || (query?.type as unknown) || (query?.topic as unknown);

    if (type !== 'payment' && type !== 'merchant_order') {
      return { ok: true };
    }
    if (!paymentId) return { ok: true };

    try {
      const p = await this.mp.getPayment(String(paymentId));
      const status = p.status;
      const externalRef: string | undefined = p.external_reference;
      if (!externalRef) return { ok: true };
      if (status === 'approved') {
        const order = await this.orders.getByCode(String(externalRef));
        if (order) {
          await this.orders.markPaid(order.id, { externalId: String(p.id || paymentId) });
          this.logger.log(`Order ${order.id} marked paid via MP webhook payment=${p?.id}`);
        } else {
          this.logger.warn(`Webhook approved but order not found for code=${externalRef}`);
        }
      }
    } catch (e) {
      this.logger.error(`MP webhook error: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { ok: true };
  }
}

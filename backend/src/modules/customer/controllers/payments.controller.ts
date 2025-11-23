import { Body, Controller, Post, Logger, Query } from '@nestjs/common';
import { Public } from '../../../common/auth/auth.decorators';
import { OrdersService } from '../../core/orders.service';
import { MercadoPagoService } from '../../payments/mercadopago.service';

@Controller('payments/mercadopago')
export class CustomerPaymentsController {
  private readonly logger = new Logger('CustomerPaymentsController');
  constructor(
    private readonly orders: OrdersService,
    private readonly mp: MercadoPagoService,
  ) {}

  @Post('preference')
  @Public()
  async createPreference(@Body() body: { orderId: string }) {
    const order = await this.orders.get(body.orderId);
    if (!order) throw new Error('order not found');
    if (order.status !== 'pending_payment') throw new Error('order not pending');

    // Build and validate absolute return URLs for MercadoPago
    const rawCustomerBase = String(process.env.CUSTOMER_BASE_URL || '').trim();
    if (!rawCustomerBase) {
      throw new Error('CONFIG_ERROR: Set CUSTOMER_BASE_URL to a full http(s) URL (e.g., https://customer.example.com)');
    }
    const customerBase = rawCustomerBase.replace(/\/$/, '');
    if (!/^https?:\/\//i.test(customerBase)) {
      // Fail fast with a clear configuration error instead of sending an invalid MP request
      throw new Error('CONFIG_ERROR: Set CUSTOMER_BASE_URL to a full http(s) URL (e.g., https://customer.example.com)');
    }

    const rawPublicBase = String(process.env.API_PUBLIC_BASE_URL || '').trim();
    if (!rawPublicBase) {
      throw new Error('CONFIG_ERROR: Set API_PUBLIC_BASE_URL to a full http(s) URL (e.g., https://api.example.com)');
    }
    const publicBase = rawPublicBase.replace(/\/$/, '');

    // Always include external_reference in return URLs for robustness
    const query = `external_reference=${encodeURIComponent(order.shortCode)}`;
    const successUrl = `${customerBase}/return-mp?${query}`;
    const failureUrl = `${customerBase}/return-mp?${query}`;
    const pendingUrl = `${customerBase}/return-mp?${query}`;
    const notificationUrl = `${publicBase}/v1/payments/mercadopago/webhook`;

    const pref = await this.mp.createPreference({
      external_reference: order.shortCode,
      items: order.items.map((it) => ({
        title: it.name || it.id,
        quantity: it.qty,
        unit_price: it.unitPrice, // ARS units assumed
      })),
      successUrl,
      failureUrl,
      pendingUrl,
      notificationUrl,
    });

    this.logger.log(`Created MP preference for order ${order.id} code=${order.shortCode} pref=${pref.id}`);
    return { preferenceId: pref.id, initPoint: pref.init_point };
  }

  // Webhook for asynchronous notifications
  @Post('webhook')
  @Public()
  async webhook(@Body() body: any, @Query() query: any) {
    // MP may send id in different places
    const paymentId = body?.data?.id || query?.['data.id'] || query?.id || body?.id;
    const type = body?.type || query?.type || query?.topic;

    if (type !== 'payment' && type !== 'merchant_order') {
      return { ok: true };
    }
    if (!paymentId) return { ok: true };

    try {
      const p = await this.mp.getPayment(String(paymentId));
      const status = p?.status;
      const externalRef: string | undefined = p?.external_reference;
      if (!externalRef) return { ok: true };
      if (status === 'approved') {
        const order = await this.orders.getByCode(String(externalRef));
        if (order) {
          await this.orders.markPaid(order.id, { externalId: String(p?.id || paymentId) });
          this.logger.log(`Order ${order.id} marked paid via MP webhook payment=${p?.id}`);
        } else {
          this.logger.warn(`Webhook approved but order not found for code=${externalRef}`);
        }
      }
    } catch (e) {
      this.logger.error('MP webhook error', e as any);
    }

    return { ok: true };
  }
}

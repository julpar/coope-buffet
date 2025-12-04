import { Injectable, Logger } from '@nestjs/common';
import {
  MpPaymentType,
  MP_ALL_PAYMENT_TYPES,
  MP_DEFAULT_ALLOWED_TYPES,
} from './mp.types';

type PreferenceItem = {
  title: string;
  quantity: number;
  unit_price: number; // ARS
  currency_id?: string; // e.g., "ARS"
};

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger('MercadoPagoService');
  private readonly apiBase = 'https://api.mercadopago.com';

  private get accessToken(): string {
    const tok = process.env.MP_ACCESS_TOKEN || '';
    if (!tok) this.logger.warn('MP_ACCESS_TOKEN is not set');
    return tok;
  }

  async createPreference(input: {
    external_reference: string; // order shortCode
    items: PreferenceItem[];
    successUrl: string;
    failureUrl: string;
    pendingUrl: string;
    notificationUrl: string;
    // Optional: explicitly allow a subset of payment types (from the hardcoded list below).
    // If not provided, defaults to ['account_money','credit_card','debit_card','prepaid_card']
    allowedPaymentTypes?: MpPaymentType[];
  }): Promise<{ id: string; init_point: string; sandbox_init_point?: string }>
  {
    const allowedSet = new Set(
      Array.isArray(input.allowedPaymentTypes) && input.allowedPaymentTypes.length
        ? input.allowedPaymentTypes.filter((t): t is MpPaymentType => (MP_ALL_PAYMENT_TYPES as readonly string[]).includes(String(t)))
        : MP_DEFAULT_ALLOWED_TYPES,
    );
    // Mercado Pago does not allow excluding account_money. Ensure it is never listed under excluded_payment_types
    const excludedTypes = MP_ALL_PAYMENT_TYPES.filter((t) => t !== MpPaymentType.AccountMoney && !allowedSet.has(t)).map((id) => ({ id }));

    const body = {
      items: input.items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unit_price: Number((i.unit_price || 0).toFixed(2)),
        currency_id: i.currency_id || 'ARS',
      })),
      external_reference: input.external_reference,
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      auto_return: 'approved',
      notification_url: input.notificationUrl,
      // Restrict available payment types in Checkout Pro using a fixed hardcoded list.
      // By default allow only: account money (balance), credit card, debit card, prepaid card.
      // Exclude all others, or compute from provided allowedPaymentTypes.
      payment_methods: {
        excluded_payment_types: excludedTypes,
      },
    } as any;

    const resp = await fetch(`${this.apiBase}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text();
      this.logger.error(`createPreference failed: ${resp.status} ${resp.statusText} ${t}`);
      throw new Error('mercadopago_preference_failed');
    }
    const json = await resp.json();
    return { id: json.id, init_point: json.init_point, sandbox_init_point: json.sandbox_init_point };
  }

  async getPayment(paymentId: string): Promise<any> {
    const resp = await fetch(`${this.apiBase}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
    });
    if (!resp.ok) {
      const t = await resp.text();
      this.logger.error(`getPayment failed: ${resp.status} ${resp.statusText} ${t}`);
      throw new Error('mercadopago_payment_fetch_failed');
    }
    return resp.json();
  }
}

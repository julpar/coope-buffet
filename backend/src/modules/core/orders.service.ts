import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { MenuService } from './menu.service';

export type OrderState = 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled';

export type OrderItem = {
  id: string; // menu item id
  name?: string;
  unitPrice: number; // cents
  qty: number;
};

export interface Order {
  id: string;
  createdAt: string;
  updatedAt: string;
  channel: 'pickup' | 'delivery' | 'in-store';
  status: OrderState;
  // Simplified: no intermediate fulfillment transitions; only boolean completed flag
  fulfillment?: boolean; // false/undefined until completed; true when delivered
  // Short, non-guessable code for cashier/fulfillment scanning (e.g., 6 chars)
  shortCode: string;
  items: OrderItem[];
  subtotal: number; // cents
  total: number; // cents (taxes/fees not modeled yet)
  customerName?: string; // optional display name provided by customer
  note?: string; // kept for backward-compat but no longer accepted from clients
  payment?: { method: 'online' | 'cash'; externalId?: string | null; paidAt?: string | null };
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('OrdersService');
  private readonly ORDER_KEY_PREFIX = 'order#';
  private readonly ORDER_CODE_PREFIX = 'ordercode#';
  private readonly LIST_PENDING = 'orders:pending_payment';
  private readonly LIST_PAID = 'orders:paid';
  private readonly LIST_FULFILLED = 'orders:fulfilled';

  constructor(private readonly redis: RedisService, private readonly menu: MenuService) {}

  private orderKey(id: string) { return `${this.ORDER_KEY_PREFIX}${id}`; }

  // Utils
  private newOrderId(): string {
    const rnd = Math.random().toString(36).slice(2, 8);
    return `o_${Date.now()}_${rnd}`;
  }
  private computeTotals(items: OrderItem[]): { subtotal: number; total: number } {
    const subtotal = items.reduce((acc, it) => acc + it.unitPrice * it.qty, 0);
    // No extra fees yet
    return { subtotal, total: subtotal };
  }

  private async generateUniqueShortCode(): Promise<string> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O, I, 0, 1
    function gen(len = 6) {
      let s = '';
      for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
      return s;
    }
    for (let attempts = 0; attempts < 1000; attempts++) {
      const code = gen(6);
      const exists = await this.redis.redis.get(this.ORDER_CODE_PREFIX + code);
      if (!exists) return code;
    }
    // Fallback to timestamp-based
    return ('X' + Math.random().toString(36).slice(2, 8)).toUpperCase();
  }

  private async bindCode(code: string, orderId: string): Promise<void> {
    await this.redis.redis.set(this.ORDER_CODE_PREFIX + code, orderId);
  }

  async getByCode(code: string): Promise<Order | null> {
    const id = await this.redis.redis.get(this.ORDER_CODE_PREFIX + (code || '').toUpperCase());
    if (!id) return null;
    return this.get(id);
  }

  async get(id: string): Promise<Order | null> {
    const raw = await this.redis.redis.get(this.orderKey(id));
    if (!raw) return null;
    try { return JSON.parse(raw) as Order; } catch { return null; }
  }

  async createPending(input: {
    channel: Order['channel'];
    items: Array<{ id: string; qty: number }>; // price sourced from menu
    customerName?: string;
    paymentMethod?: 'online' | 'cash';
  }): Promise<Order> {
    // Load items and validate stock (best-effort; final check on payment/advance can re-validate)
    const menuItems = await this.menu.listItems();
    const byId = new Map(menuItems.map((m) => [m.id, m] as const));
    const norm: OrderItem[] = input.items.map((it) => {
      const found = byId.get(it.id);
      const unitPrice = found?.price ?? 0;
      return { id: it.id, name: found?.name, unitPrice, qty: Math.max(1, Number(it.qty || 1)) };
    });
    const { subtotal, total } = this.computeTotals(norm);
    const now = new Date().toISOString();
    const shortCode = await this.generateUniqueShortCode();
    const order: Order = {
      id: this.newOrderId(),
      createdAt: now,
      updatedAt: now,
      channel: input.channel,
      status: 'pending_payment',
      fulfillment: false,
      shortCode,
      items: norm,
      subtotal,
      total,
      customerName: input.customerName,
      payment: { method: input.paymentMethod ?? 'cash', externalId: null, paidAt: null },
    };
    await this.redis.redis.set(this.orderKey(order.id), JSON.stringify(order));
    await this.bindCode(shortCode, order.id);
    await this.redis.redis.lpush(this.LIST_PENDING, order.id);
    this.logger.log(`create order id=${order.id} total=${order.total} state=pending_payment`);
    return order;
  }

  // Transition helpers move IDs across lists atomically.
  private async moveList(id: string, from: string | null, to: string | null): Promise<void> {
    const multi = this.redis.redis.multi();
    if (from) multi.lrem(from, 0, id);
    if (to) multi.lpush(to, id);
    await multi.exec();
  }

  private async save(order: Order): Promise<void> {
    order.updatedAt = new Date().toISOString();
    await this.redis.redis.set(this.orderKey(order.id), JSON.stringify(order));
  }

  async markPaid(id: string, opts?: { externalId?: string | null }): Promise<Order | null> {
    const o = await this.get(id);
    if (!o) return null;
    if (o.status === 'paid') return o;
    if (o.status !== 'pending_payment') return o;
    // Optionally reserve stock earlier; for now, adjust stock now when paid
    for (const it of o.items) {
      await this.menu.adjustStock(it.id, -it.qty);
    }
    o.status = 'paid';
    o.fulfillment = false;
    if (o.payment) {
      o.payment.paidAt = new Date().toISOString();
      if (opts?.externalId !== undefined) o.payment.externalId = opts.externalId;
    }
    await this.save(o);
    await this.moveList(o.id, this.LIST_PENDING, this.LIST_PAID);
    this.logger.log(`order paid id=${o.id} total=${o.total}`);
    return o;
  }

  async complete(id: string): Promise<Order | null> {
    const o = await this.get(id);
    if (!o) return null;
    if (o.status === 'fulfilled') return o;
    if (o.status !== 'paid') return o;
    o.status = 'fulfilled';
    o.fulfillment = true;
    await this.save(o);
    await this.moveList(o.id, this.LIST_PAID, this.LIST_FULFILLED);
    this.logger.log(`order fulfilled id=${o.id}`);
    return o;
  }

  async cancel(id: string): Promise<Order | null> {
    const o = await this.get(id);
    if (!o) return null;
    if (o.status === 'cancelled') return o;
    // If it was already paid, refund stock
    if (o.status === 'paid') {
      for (const it of o.items) await this.menu.adjustStock(it.id, it.qty);
    }
    const from = o.status === 'pending_payment' ? this.LIST_PENDING : o.status === 'paid' ? this.LIST_PAID : null;
    o.status = 'cancelled';
    await this.save(o);
    await this.moveList(o.id, from, null);
    this.logger.warn(`order cancelled id=${o.id}`);
    return o;
  }

  async listByState(state: OrderState): Promise<Order[]> {
    let listKey: string | null = null;
    if (state === 'pending_payment') listKey = this.LIST_PENDING;
    else if (state === 'paid') listKey = this.LIST_PAID;
    else if (state === 'fulfilled') listKey = this.LIST_FULFILLED;
    else listKey = null;
    if (!listKey) return [];
    const ids = (await this.redis.redis.lrange(listKey, 0, -1)).filter(Boolean);
    if (ids.length === 0) return [];
    const keys = ids.map((id) => this.orderKey(id));
    const raws = await this.redis.redis.mget(keys);
    const out: Order[] = [];
    for (const raw of raws) {
      try { if (raw) out.push(JSON.parse(raw as unknown as string)); } catch {}
    }
    // Sort by createdAt ascending
    out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return out;
  }

  // List all active orders across states (pending_payment, paid, fulfilled)
  async listAll(): Promise<Order[]> {
    const lists = [this.LIST_PENDING, this.LIST_PAID, this.LIST_FULFILLED];
    const perList = await Promise.all(lists.map((k) => this.redis.redis.lrange(k, 0, -1)));
    const ids = Array.from(new Set(perList.flat().filter(Boolean)));
    if (ids.length === 0) return [];
    const keys = ids.map((id) => this.orderKey(id));
    const raws = await this.redis.redis.mget(keys);
    const out: Order[] = [];
    for (const raw of raws) {
      try { if (raw) out.push(JSON.parse(raw as unknown as string)); } catch {}
    }
    // Sort by createdAt ascending
    out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return out;
  }

  // Simplified: allow only switching to fulfilled=true while in paid state
  async setFulfillment(id: string, fulfilled: boolean): Promise<Order | null> {
    const o = await this.get(id);
    if (!o) return null;
    if (o.status !== 'paid') return o; // only while paid
    // Only transition allowed is to mark as fulfilled (true)
    if (!fulfilled) return o;
    await this.complete(id);
    this.logger.log(`order fulfillment id=${o.id} -> fulfilled=true`);
    return await this.get(id);
  }
}

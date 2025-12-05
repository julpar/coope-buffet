import { Body, Controller, Get, Logger, Param, Post, BadRequestException } from '@nestjs/common';
import { Public } from '../../../common/auth/auth.decorators';
import { OrdersService, Order } from '../../core/orders.service';

@Controller('orders')
export class CustomerOrdersController {
  private readonly logger = new Logger('CustomerOrdersController');
  constructor(private readonly orders: OrdersService) {}

  // Create a pending order (guest flow). In real flow, payment will redirect/confirm later.
  @Post()
  @Public()
  async create(
    @Body()
    body: {
      channel: Order['channel'];
      items: Array<{ id: string; qty: number }>;
      customerName?: string;
      paymentMethod?: 'online' | 'cash';
    },
  ) {
    try {
      const o = await this.orders.createPending({
        channel: body.channel,
        items: body.items || [],
        customerName: body.customerName,
        paymentMethod: body.paymentMethod,
      });
      this.logger.log(`create order id=${o.id} channel=${o.channel} total=${o.total}`);
      return o;
    } catch (e: unknown) {
      if (
        typeof e === 'object' && e !== null &&
        'name' in e && (e as { name?: unknown }).name === 'InsufficientStockError' &&
        'shortages' in e
      ) {
        // 400 with machine-friendly code and shortages list
        const shortages = (e as { shortages?: unknown }).shortages;
        throw new BadRequestException({ code: 'INSUFFICIENT_STOCK', message: 'Not enough stock for some items', shortages });
      }
      throw e;
    }
  }

  @Get(':id')
  @Public()
  async get(@Param('id') id: string) {
    const o = await this.orders.get(id);
    if (!o) throw new Error('order not found');
    return o;
  }

  @Get('code/:code')
  @Public()
  async getByCode(@Param('code') code: string) {
    // MercadoPago return URLs may include duplicated external_reference values,
    // and some frameworks/joiners can concatenate them with commas.
    // Normalize by taking the first non-empty token before querying.
    const norm = String(code || '')
      .split(',')
      .map((s) => s.trim())
      .find((s) => s.length > 0) || '';
    const o = await this.orders.getByCode(norm);
    if (!o) throw new Error('order not found');
    return o;
  }
}

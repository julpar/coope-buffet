import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
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
    const o = await this.orders.createPending({
      channel: body.channel,
      items: body.items || [],
      customerName: body.customerName,
      paymentMethod: body.paymentMethod,
    });
    this.logger.log(`create order id=${o.id} channel=${o.channel} total=${o.total}`);
    return o;
  }

  @Get(':id')
  @Public()
  async get(@Param('id') id: string) {
    const o = await this.orders.get(id);
    if (!o) throw new Error('order not found');
    return o;
  }
}

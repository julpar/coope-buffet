import { Body, Controller, Get, Logger, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../../common/auth/auth.decorators';
import { OrdersService, OrderState, FulfillmentStatus } from '../../core/orders.service';

@Controller('staff/orders')
@Roles('ORDER_FULFILLER', 'CASHIER', 'ADMIN')
export class StaffOrdersController {
  private readonly logger = new Logger('StaffOrdersController');
  constructor(private readonly orders: OrdersService) {}

  @Get()
  async list(@Query('state') state: OrderState = 'paid') {
    const s = state || 'paid';
    const list = await this.orders.listByState(s);
    this.logger.debug(`list orders state=${s} count=${list.length}`);
    return list;
  }

  // Lookup order by short code (used by cashier QR/manual input)
  @Get('lookup')
  async lookupByCode(@Query('code') code: string) {
    if (!code) throw new Error('code required');
    const o = await this.orders.getByCode(String(code).toUpperCase());
    if (!o) throw new Error('order not found');
    return o;
  }

  // Cashier/MP webhook would call this; for now exposed for staff
  @Post(':id/paid')
  async markPaid(@Param('id') id: string, @Body() body: { externalId?: string | null }) {
    const o = await this.orders.markPaid(id, { externalId: body?.externalId ?? null });
    if (!o) throw new Error('order not found');
    return o;
  }

  // Convenience: mark paid by short code
  @Post('paid-by-code')
  async markPaidByCode(@Body() body: { code: string; externalId?: string | null }) {
    const code = body?.code?.toUpperCase?.() || '';
    if (!code) throw new Error('code required');
    const o0 = await this.orders.getByCode(code);
    if (!o0) throw new Error('order not found');
    const o = await this.orders.markPaid(o0.id, { externalId: body?.externalId ?? null });
    if (!o) throw new Error('order not found');
    return o;
  }

  // Fulfillment status progression while in paid state
  @Post(':id/fulfillment')
  async setFulfillment(@Param('id') id: string, @Body() body: { status: FulfillmentStatus }) {
    const o = await this.orders.setFulfillment(id, body?.status as FulfillmentStatus);
    if (!o) throw new Error('order not found');
    return o;
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    const o = await this.orders.cancel(id);
    if (!o) throw new Error('order not found');
    return o;
  }
}

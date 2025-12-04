import { BadRequestException, Body, ConflictException, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { Public } from '../../../common/auth/auth.decorators';
import { OrdersService } from '../../core/orders.service';
import { FeedbackService } from '../../core/feedback.service';

@Controller('feedback')
export class CustomerFeedbackController {
  private readonly logger = new Logger('CustomerFeedbackController');
  constructor(
    private readonly orders: OrdersService,
    private readonly feedback: FeedbackService,
  ) {}

  @Get('status/:orderId')
  @Public()
  async status(@Param('orderId') orderId: string) {
    if (!orderId) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'orderId requerido' });
    const submitted = await this.feedback.has(orderId);
    return { submitted };
  }

  @Post()
  @Public()
  async submit(
    @Body()
    body: {
      orderId: string;
      // Preferred english names
      ease?: number;
      speed?: number;
      quality?: number;
      // Backwards-compat: accept spanish keys from old clients
      facilidad?: number;
      velocidad?: number;
      calidad?: number;
      comment?: string;
    },
  ) {
    const orderId = (body?.orderId || '').trim();
    if (!orderId) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'orderId requerido' });
    const order = await this.orders.get(orderId);
    if (!order) throw new BadRequestException({ code: 'ORDER_NOT_FOUND', message: 'Pedido no encontrado' });
    if (order.status !== 'fulfilled') {
      throw new BadRequestException({ code: 'ORDER_NOT_FULFILLED', message: 'La encuesta se puede completar solo cuando el pedido fue entregado.' });
    }
    try {
      // Map spanish fallback keys if english ones are not present
      const ease = body?.ease ?? body?.facilidad;
      const speed = body?.speed ?? body?.velocidad;
      const quality = body?.quality ?? body?.calidad;
      const rec = await this.feedback.submit(order, { ease, speed, quality, comment: body?.comment });
      this.logger.log(`feedback submitted order=${order.shortCode} avg=${rec.avg}`);
      return { ok: true };
    } catch (e: any) {
      if (String(e?.message) === 'feedback_already_exists') {
        throw new ConflictException({ code: 'ALREADY_SUBMITTED', message: 'Ya existe una respuesta para este pedido.' });
      }
      throw e;
    }
  }
}

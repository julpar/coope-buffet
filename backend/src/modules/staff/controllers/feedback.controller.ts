import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../common/auth/auth.decorators';
import { FeedbackService } from '../../core/feedback.service';

@Controller('staff/feedback')
@Roles('ORDER_FULFILLER', 'CASHIER', 'ADMIN', 'STOCK')
export class StaffFeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get('summary')
  async summary() {
    return this.feedback.summary(50);
  }
}

import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { AppController } from './controllers/app.controller';
import { MenuController } from './controllers/menu.controller';
import { CustomerOrdersController } from './controllers/orders.controller';
import { CustomerPaymentsController } from './controllers/payments.controller';
import { CustomerFeedbackController } from './controllers/feedback.controller';

@Module({
  imports: [CoreModule],
  controllers: [AppController, MenuController, CustomerOrdersController, CustomerPaymentsController, CustomerFeedbackController],
})
export class CustomerModule {}

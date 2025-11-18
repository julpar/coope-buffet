import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { StaffController } from './controllers/staff.controller';
import { UsersController } from './controllers/users.controller';
import { StaffOrdersController } from './controllers/orders.controller';

@Module({
  imports: [CoreModule],
  controllers: [StaffController, UsersController, StaffOrdersController],
})
export class StaffModule {}

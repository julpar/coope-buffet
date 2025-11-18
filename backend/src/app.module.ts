import { Module } from '@nestjs/common';
import { CustomerModule } from './modules/customer/customer.module';
import { StaffModule } from './modules/staff/staff.module';

@Module({
  imports: [CustomerModule, StaffModule],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { CustomerModule } from './modules/customer/customer.module';
import { StaffModule } from './modules/staff/staff.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [CustomerModule, StaffModule, AuthModule],
})
export class AppModule {}

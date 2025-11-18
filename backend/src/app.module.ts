import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CustomerModule } from './modules/customer/customer.module';
import { StaffModule } from './modules/staff/staff.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesGuard } from './common/auth/roles.guard';

@Module({
  imports: [CustomerModule, StaffModule, AuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

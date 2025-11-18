import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { StaffController } from './controllers/staff.controller';
import { UsersController } from './controllers/users.controller';

@Module({
  imports: [CoreModule],
  controllers: [StaffController, UsersController],
})
export class StaffModule {}

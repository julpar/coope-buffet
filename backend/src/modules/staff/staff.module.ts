import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { StaffController } from './controllers/staff.controller';

@Module({
  imports: [CoreModule],
  controllers: [StaffController],
})
export class StaffModule {}

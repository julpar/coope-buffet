import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { StaffController } from './controllers/staff.controller';
import { UsersController } from './controllers/users.controller';
import { StaffOrdersController } from './controllers/orders.controller';
import { StaffPlatformController } from './controllers/platform.controller';
import { StaffFeedbackController } from './controllers/feedback.controller';
import { StaffUploadController } from './controllers/upload.controller';

@Module({
  imports: [CoreModule],
  controllers: [StaffController, UsersController, StaffOrdersController, StaffPlatformController, StaffUploadController, StaffFeedbackController],
})
export class StaffModule {}

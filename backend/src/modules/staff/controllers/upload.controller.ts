import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '../../../common/auth/auth.decorators';
import { R2Service } from '../../core/r2.service';

@Controller('staff')
@Roles('STOCK', 'ADMIN')
export class StaffUploadController {
  constructor(private readonly r2: R2Service) {}

  @Post('upload-url')
  async createUploadUrl(@Body() body: { filename?: string; contentType?: string }) {
    if (!this.r2.isEnabled()) {
      // Keep error simple; frontend will show a clear message.
      throw new Error('Cloud storage not configured');
    }
    const filename = (body?.filename || 'image').toString();
    const contentType = body?.contentType;
    const res = await this.r2.presignPut({ filename, contentType });
    return res;
  }
}

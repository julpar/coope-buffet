import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { MenuService } from './menu.service';

@Module({
  providers: [RedisService, MenuService],
  exports: [RedisService, MenuService],
})
export class CoreModule {}

import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { MenuService } from './menu.service';
import { UserService } from './user.service';

@Module({
  providers: [RedisService, MenuService, UserService],
  exports: [RedisService, MenuService, UserService],
})
export class CoreModule {}

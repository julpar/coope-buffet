import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { MenuService } from './menu.service';
import { UserService } from './user.service';
import { OrdersService } from './orders.service';

@Module({
  providers: [RedisService, MenuService, UserService, OrdersService],
  exports: [RedisService, MenuService, UserService, OrdersService],
})
export class CoreModule {}

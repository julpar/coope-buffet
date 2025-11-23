import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { MenuService } from './menu.service';
import { UserService } from './user.service';
import { OrdersService } from './orders.service';
import { MercadoPagoService } from '../payments/mercadopago.service';

@Module({
  providers: [RedisService, MenuService, UserService, OrdersService, MercadoPagoService],
  exports: [RedisService, MenuService, UserService, OrdersService, MercadoPagoService],
})
export class CoreModule {}

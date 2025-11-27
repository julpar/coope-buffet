import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { MenuService } from './menu.service';
import { UserService } from './user.service';
import { OrdersService } from './orders.service';
import { MercadoPagoService } from '../payments/mercadopago.service';
import { R2Service } from './r2.service';

@Module({
  providers: [RedisService, MenuService, UserService, OrdersService, MercadoPagoService, R2Service],
  exports: [RedisService, MenuService, UserService, OrdersService, MercadoPagoService, R2Service],
})
export class CoreModule {}

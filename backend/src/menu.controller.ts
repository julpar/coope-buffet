import { Controller, Get, Logger, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MenuService } from './menu.service';

@Controller('api/menu')
export class MenuController {
  private readonly logger = new Logger('MenuController');
  constructor(private readonly menu: MenuService) {}

  // Public menu for customers
  @Get()
  async getMenu(@Req() req: Request) {
    const data = await this.menu.publicMenu();
    const catCount = data.categories.length;
    const itemCount = data.categories.reduce((acc, c) => acc + (c.items?.length || 0), 0);
    this.logger.debug(`menu fetched categories=${catCount} items=${itemCount} rid=${(req as any).id ?? '-'}`);
    return data;
  }
}

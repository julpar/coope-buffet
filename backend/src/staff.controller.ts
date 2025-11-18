import { Body, Controller, Get, Logger, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MenuService, Category, MenuItem } from './menu.service';

@Controller('api/staff/menu')
export class StaffController {
  private readonly logger = new Logger('StaffController');
  constructor(private readonly menu: MenuService) {}

  // Categories
  @Get('categories')
  async listCategories() {
    return this.menu.listCategories();
  }

  @Put('categories/:id')
  async upsertCategory(@Param('id') id: string, @Body() body: Partial<Category>, @Req() req: Request) {
    const cat: Category = {
      id,
      name: body.name ?? id,
      order: body.order ?? 0,
    };
    await this.menu.upsertCategory(cat);
    this.logger.log(`upsert category id=${id} name=${cat.name} rid=${(req as any).id ?? '-'}`);
    return { ok: true };
  }

  // Items
  @Get('items')
  async listItems() {
    return this.menu.listItems();
  }

  @Put('items/:id')
  async upsertItem(@Param('id') id: string, @Body() body: Partial<MenuItem>, @Req() req: Request) {
    if (!body.categoryId) {
      return { ok: false, error: 'categoryId is required' };
    }
    const item: MenuItem = {
      id,
      name: body.name ?? id,
      categoryId: body.categoryId,
      price: typeof body.price === 'number' ? body.price : 0,
      isGlutenFree: !!body.isGlutenFree,
      imageUrl: body.imageUrl,
      stock: typeof body.stock === 'number' ? body.stock : 0,
      lowStockThreshold: typeof body.lowStockThreshold === 'number' ? body.lowStockThreshold : 0,
      active: body.active !== false,
    };
    await this.menu.upsertItem(item);
    this.logger.log(
      `upsert item id=${id} category=${item.categoryId} price=${item.price} stock=${item.stock} active=${item.active} rid=${(req as any).id ?? '-'}`,
    );
    return { ok: true };
  }

  @Post('items/:id/stock')
  async adjustStock(@Param('id') id: string, @Body() body: { delta?: number }, @Req() req: Request) {
    const delta = Number(body?.delta ?? 0);
    const updated = await this.menu.adjustStock(id, delta);
    if (!updated) return { ok: false, error: 'not_found' };
    this.logger.log(
      `adjust stock id=${id} delta=${delta} newStock=${updated.stock ?? 0} rid=${(req as any).id ?? '-'}`,
    );
    return { ok: true, item: updated };
  }
}

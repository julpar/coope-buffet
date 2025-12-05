import { Body, Controller, Delete, Get, Logger, Param, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { MenuService, Category, MenuItem } from '../../core/menu.service';
import { MENU_CATEGORIES } from '../../core/menu.constants';
import { Roles } from '../../../common/auth/auth.decorators';

@Controller('staff/menu')
@Roles('STOCK', 'ADMIN')
export class StaffController {
  private readonly logger = new Logger('StaffController');
  constructor(private readonly menu: MenuService) {}

  // Categories
  @Get('categories')
  async listCategories() {
    // Return hardcoded categories from project constant as requested
    return MENU_CATEGORIES;
  }

  @Put('categories/:id')
  async upsertCategory(@Param('id') id: string, @Body() body: Partial<Category>, @Req() req: Request) {
    const cat: Category = {
      id,
      name: body.name ?? id,
      order: body.order ?? 0,
    };
    await this.menu.upsertCategory(cat);
    const rid = (req as Request & { id?: string }).id ?? '-';
    this.logger.log(`upsert category id=${id} name=${cat.name} rid=${rid}`);
    // Frontend expects the updated Category object
    return cat;
  }

  // Items
  @Get('items')
  async listItems() {
    return this.menu.listItems();
  }

  @Put('items/:id')
  async upsertItem(@Param('id') id: string, @Body() body: Partial<MenuItem>, @Req() req: Request) {
    if (!body.categoryId) {
      // Keep error shape simple; frontend treats non-2xx as error
      throw new Error('categoryId is required');
    }
    // Coerce numeric fields defensively to handle strings/nulls from clients
    const toNum = (v: unknown, def = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : def;
    };
    const item: MenuItem = {
      id,
      name: body.name ?? id,
      categoryId: body.categoryId,
      price: toNum(body.price, 0),
      isGlutenFree: !!body.isGlutenFree,
      imageUrl: body.imageUrl,
      stock: toNum(body.stock, 0),
      lowStockThreshold: toNum(body.lowStockThreshold, 0),
      active: body.active !== false,
    };
    await this.menu.upsertItem(item);
    const rid = (req as Request & { id?: string }).id ?? '-';
    this.logger.log(
      `upsert item id=${id} category=${item.categoryId} price=${item.price} stock=${item.stock} active=${item.active} rid=${rid}`,
    );
    // Frontend expects the updated Item object
    return item;
  }

  @Post('items/:id/stock')
  async adjustStock(@Param('id') id: string, @Body() body: { delta?: number }, @Req() req: Request) {
    const delta = Number(body?.delta ?? 0);
    const updated = await this.menu.adjustStock(id, delta);
    if (!updated) {
      // Not found -> 200 with error would confuse frontend which expects throw on !ok
      // Throw to yield non-2xx
      throw new Error('item not found');
    }
    const rid = (req as Request & { id?: string }).id ?? '-';
    this.logger.log(
      `adjust stock id=${id} delta=${delta} newStock=${updated.stock ?? 0} rid=${rid}`,
    );
    // Frontend expects { id, stock }
    return { id: updated.id, stock: updated.stock ?? 0 };
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string, @Req() req: Request) {
    const existed = await this.menu.deleteItem(id);
    const rid = (req as Request & { id?: string }).id ?? '-';
    this.logger.log(
      `delete item id=${id} existed=${existed} rid=${rid}`,
    );
    return { ok: true };
  }
}

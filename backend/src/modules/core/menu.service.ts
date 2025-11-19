import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { MENU_CATEGORIES } from './menu.constants';

export type Category = {
  id: string; // slug or uuid
  name: string;
  order?: number;
};

export type MenuItem = {
  id: string;
  name: string;
  categoryId: string;
  price: number; // cents
  isGlutenFree?: boolean;
  imageUrl?: string;
  stock?: number; // current available stock
  lowStockThreshold?: number; // optional threshold for limited badge
  active?: boolean; // allow hiding without deletion
};

@Injectable()
export class MenuService {
  private readonly CAT_KEY = 'menu:categories'; // JSON array
  private readonly ITEM_KEY = 'menu:items'; // Redis hash id -> JSON

  constructor(private readonly redisSvc: RedisService) {}

  // Categories
  async listCategories(): Promise<Category[]> {
    const v = await this.redisSvc.redis.get(this.CAT_KEY);
    if (!v) return [];
    try {
      const arr = JSON.parse(v) as Category[];
      return arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch {
      return [];
    }
  }

  async upsertCategory(cat: Category): Promise<void> {
    const list = await this.listCategories();
    const idx = list.findIndex((c) => c.id === cat.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...cat };
    else list.push(cat);
    await this.redisSvc.redis.set(this.CAT_KEY, JSON.stringify(list));
  }

  // Items
  async getItem(id: string): Promise<MenuItem | null> {
    const raw = await this.redisSvc.redis.hget(this.ITEM_KEY, id);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MenuItem;
    } catch {
      return null;
    }
  }

  async listItems(): Promise<MenuItem[]> {
    const all = await this.redisSvc.redis.hgetall(this.ITEM_KEY);
    return Object.values(all).flatMap((raw) => {
      try {
        return [JSON.parse(raw) as MenuItem];
      } catch {
        return [];
      }
    });
  }

  async upsertItem(item: MenuItem): Promise<void> {
    if (item.stock != null && item.stock < 0) item.stock = 0;
    if (item.active == null) item.active = true;
    await this.redisSvc.redis.hset(this.ITEM_KEY, item.id, JSON.stringify(item));
  }

  async deleteItem(id: string): Promise<boolean> {
    const removed = await this.redisSvc.redis.hdel(this.ITEM_KEY, id);
    return removed > 0;
  }

  async adjustStock(itemId: string, delta: number): Promise<MenuItem | null> {
    const item = await this.getItem(itemId);
    if (!item) return null;
    const current = item.stock ?? 0;
    const next = Math.max(0, current + delta);
    item.stock = next;
    await this.upsertItem(item);
    return item;
  }

  // Public menu projection
  async publicMenu() {
    const [catsFromDb, items] = await Promise.all([this.listCategories(), this.listItems()]);
    // If no categories were configured yet, fall back to defaults so the
    // public menu still returns items grouped by category as expected.
    const categories = catsFromDb.length > 0 ? catsFromDb : MENU_CATEGORIES;
    const byCat: Record<string, MenuItem[]> = {};
    for (const it of items) {
      if (it.active === false) continue;
      if (!byCat[it.categoryId]) byCat[it.categoryId] = [];
      byCat[it.categoryId].push(it);
    }
    const categoriesWithItems = categories.map((c) => {
      const its = (byCat[c.id] || []).map((it) => {
        const stock = it.stock ?? 0;
        const low = it.lowStockThreshold ?? 0;
        return {
          id: it.id,
          name: it.name,
          price: it.price,
          imageUrl: it.imageUrl || null,
          isGlutenFree: !!it.isGlutenFree,
          stock,
          availability: stock <= 0 ? 'sold-out' : stock <= low && low > 0 ? 'limited' : 'in-stock',
        };
      });
      return { ...c, items: its };
    });

    const glutenFree = items
      .filter((i) => i.active !== false && i.isGlutenFree)
      .map((it) => {
        const stock = it.stock ?? 0;
        const low = it.lowStockThreshold ?? 0;
        return {
          id: it.id,
          name: it.name,
          price: it.price,
          imageUrl: it.imageUrl || null,
          isGlutenFree: true,
          stock,
          availability: stock <= 0 ? 'sold-out' : stock <= low && low > 0 ? 'limited' : 'in-stock',
          categoryId: it.categoryId,
        };
      });

    return {
      categories: categoriesWithItems,
      glutenFree,
    };
  }
}

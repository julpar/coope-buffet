import type { Category, Item, MenuResponse } from '../types';

const BASE_URL = (import.meta as any).env?.VITE_API_BASE || '/api';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  // @ts-expect-error
  return undefined;
}

// Public
export const getPublicMenu = () => http<MenuResponse>('/menu');

// Staff endpoints (from DONE.md)
export const getStaffCategories = () => http<Category[]>('/staff/menu/categories');
export const upsertCategory = (id: string, data: Partial<Category>) => http<Category>(`/staff/menu/categories/${encodeURIComponent(id)}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const getStaffItems = () => http<Item[]>('/staff/menu/items');
export const upsertItem = (id: string, data: Partial<Item>) => http<Item>(`/staff/menu/items/${encodeURIComponent(id)}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const adjustStock = (id: string, delta: number) => http<{ id: string; stock: number }>(`/staff/menu/items/${encodeURIComponent(id)}/stock`, {
  method: 'POST',
  body: JSON.stringify({ delta }),
});

// Mock helpers for when backend is not available
export async function tryApi<T>(fn: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (_) {
    return await fallback();
  }
}

// Simple mock data (localStorage-backed)
const LS_KEY = 'staff-mock';
type MockState = { categories: Category[]; items: Item[] };
function loadMock(): MockState {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) return JSON.parse(raw);
  const initial: MockState = {
    categories: [
      { id: 'parrilla', name: 'PARRILLA', order: 1 },
      { id: 'platos', name: 'FERIA DEL PLATO', order: 2 },
      { id: 'bebidas', name: 'BEBIDAS', order: 3 },
      { id: 'otros', name: 'OTROS', order: 4 },
    ],
    items: [
      { id: 'choripan', name: 'Choripán', categoryId: 'parrilla', price: 2500, stock: 10, lowStockThreshold: 3, isGlutenFree: false },
      { id: 'ensalada', name: 'Ensalada', categoryId: 'platos', price: 2000, stock: 2, lowStockThreshold: 5, isGlutenFree: true },
      { id: 'cola', name: 'Gaseosa cola', categoryId: 'bebidas', price: 1200, stock: 0, lowStockThreshold: 5 },
    ],
  };
  localStorage.setItem(LS_KEY, JSON.stringify(initial));
  return initial;
}
function saveMock(s: MockState) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }

export const mockApi = {
  async getCategories(): Promise<Category[]> { return loadMock().categories; },
  async upsertCategory(id: string, data: Partial<Category>): Promise<Category> {
    const s = loadMock();
    const idx = s.categories.findIndex(c => c.id === id);
    const next: Category = { id, name: data.name || id, order: data.order };
    if (idx >= 0) s.categories[idx] = { ...s.categories[idx], ...next };
    else s.categories.push(next);
    saveMock(s);
    return next;
  },
  async getItems(): Promise<Item[]> { return loadMock().items; },
  async upsertItem(id: string, data: Partial<Item>): Promise<Item> {
    const s = loadMock();
    const idx = s.items.findIndex(i => i.id === id);
    const next: Item = { id, name: data.name || id, categoryId: data.categoryId || 'otros', price: data.price || 0, ...data } as Item;
    if (idx >= 0) s.items[idx] = { ...s.items[idx], ...next };
    else s.items.push(next);
    saveMock(s);
    return next;
  },
  async adjustStock(id: string, delta: number): Promise<{ id: string; stock: number }> {
    const s = loadMock();
    const it = s.items.find(i => i.id === id);
    if (!it) throw new Error('Item not found');
    const cur = Math.max(0, (it.stock || 0) + delta);
    it.stock = cur;
    saveMock(s);
    return { id, stock: cur };
  }
};

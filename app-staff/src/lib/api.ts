import type { Category, Item, MenuResponse } from '../types';
import { ref } from 'vue';

// Build absolute API base from environment variables.
// In dev, defaults to http://localhost:3000 and version v1
const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000') as string;
const API_VERSION = ((import.meta as any).env?.VITE_API_VERSION || 'v1') as string;

function buildBase(base: string, version: string): string {
  const trimmedBase = base.replace(/\/$/, '');
  const trimmedVer = version.replace(/^\//, '');
  return `${trimmedBase}/${trimmedVer}`;
}

const ABS_BASE = buildBase(API_BASE_URL, API_VERSION);
export const API_BASE = ABS_BASE;

// Reactive flag to indicate whether the app is currently relying on mocked data
// Initialized from env/session so the banner can render immediately on load.
const FORCE_MOCK = ((import.meta as any).env?.VITE_FORCE_MOCK === '1');
const SESSION_MOCK = typeof window !== 'undefined' && sessionStorage.getItem('mock-mode') === '1';
export const isMocked = ref<boolean>(FORCE_MOCK || SESSION_MOCK);

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(ABS_BASE + urlPath, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'include',
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

// Staff endpoints (from DONE.md) are exposed below via `staffApi` with graceful fallback

// Mock helpers for when backend is not available
export async function tryApi<T>(fn: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
  try {
    const res = await fn();
    // Only flip to false on success to allow mixed conditions; once mocked, stays mocked until reload
    return res;
  } catch (_) {
    // Enable mocked mode on any failure
    isMocked.value = true;
    try { sessionStorage.setItem('mock-mode', '1'); } catch {}
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

// Staff API with graceful fallback to mock when backend is unavailable
export const staffApi = {
  getCategories: () => tryApi<Category[]>(() => http('/staff/menu/categories'), () => mockApi.getCategories()),
  upsertCategory: (id: string, data: Partial<Category>) =>
    tryApi<Category>(() => http(`/staff/menu/categories/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
      () => mockApi.upsertCategory(id, data)),
  getItems: () => tryApi<Item[]>(() => http('/staff/menu/items'), () => mockApi.getItems()),
  upsertItem: (id: string, data: Partial<Item>) =>
    tryApi<Item>(() => http(`/staff/menu/items/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
      () => mockApi.upsertItem(id, data)),
  adjustStock: (id: string, delta: number) =>
    tryApi<{ id: string; stock: number }>(
      () => http(`/staff/menu/items/${encodeURIComponent(id)}/stock`, { method: 'POST', body: JSON.stringify({ delta }) }),
      () => mockApi.adjustStock(id, delta)
    )
};

// Auth and Users management
export type StaffUser = { id: string; nickname: string; roles: string[] };
export const authApi = {
  status: () => http<{ adminExists: boolean; currentUser: StaffUser | null }>(`/auth/status`),
  initAdmin: (nickname: string) => http<{ ok: true; user: StaffUser }>(`/auth/init-admin`, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  }),
};

export const usersApi = {
  list: () => http<StaffUser[]>(`/staff/users`),
  create: (nickname: string, roles: string[]) =>
    http<{ user: StaffUser; permUrl: string }>(`/staff/users`, {
      method: 'POST',
      body: JSON.stringify({ nickname, roles }),
    }),
  update: (id: string, data: Partial<{ nickname: string; roles: string[] }>) =>
    http<StaffUser>(`/staff/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: string) => http<{ ok: true }>(`/staff/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

// Background probe on startup to eagerly detect backend availability and show the banner early.
// Skips when forced mock is enabled or when a previous session already detected mock mode.
if (typeof window !== 'undefined' && !FORCE_MOCK && !SESSION_MOCK) {
  // Use a lightweight fetch; failures turn on mock mode and persist the flag for the session.
  fetch(ABS_BASE + '/menu', { method: 'GET' })
    .then((r) => {
      if (!r.ok) throw new Error('unavailable');
    })
    .catch(() => {
      isMocked.value = true;
      try { sessionStorage.setItem('mock-mode', '1'); } catch {}
    });
}

// Backwards-compatible named exports expected by some components
// These simply proxy to the staffApi methods.
export function getStaffItems() {
  return staffApi.getItems();
}
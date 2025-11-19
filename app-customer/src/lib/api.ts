import type { MenuResponse, CustomerOrder, OrderChannel } from '../types';
import { ref } from 'vue';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000') as string;
const API_VERSION = ((import.meta as any).env?.VITE_API_VERSION || 'v1') as string;

function buildBase(base: string, version: string): string {
  const trimmedBase = base.replace(/\/$/, '');
  const trimmedVer = version.replace(/^\//, '');
  return `${trimmedBase}/${trimmedVer}`;
}

const ABS_BASE = buildBase(API_BASE_URL, API_VERSION);
export const API_BASE = ABS_BASE;
export const apiOnline = ref<boolean | null>(null);

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const url = ABS_BASE + urlPath;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      credentials: 'include',
      ...init,
    });
  } catch (e) {
    apiOnline.value = false;
    throw e;
  }
  if (!res.ok) {
    apiOnline.value = false;
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  apiOnline.value = true;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  // @ts-expect-error
  return undefined;
}

export const customerApi = {
  getMenu(): Promise<MenuResponse> { return http('/menu'); },
  createOrder(input: { id: string; channel: OrderChannel; items: Array<{ id: string; qty: number }>; note?: string; paymentMethod?: 'online' | 'cash' }): Promise<CustomerOrder> {
    return http('/orders', { method: 'POST', body: JSON.stringify(input) });
  },
  getOrder(id: string): Promise<CustomerOrder> { return http(`/orders/${id}`); }
};

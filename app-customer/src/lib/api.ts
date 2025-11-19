import type { MenuResponse, CustomerOrder, OrderChannel } from '../types';
import { ref } from 'vue';
import { API_BASE as ABS_BASE } from './base';
import { platform } from './platform';
export const apiOnline = ref<boolean | null>(null);

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const url = ABS_BASE + urlPath;
  let res: Response;
  try {
    // Just-in-time platform status check before any server communication
    // Debounced inside platform implementation to avoid bursts
    await platform.fetch();
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
  createOrder(input: { channel: OrderChannel; items: Array<{ id: string; qty: number }>; customerName?: string; paymentMethod?: 'online' | 'cash' }): Promise<CustomerOrder> {
    return http('/orders', { method: 'POST', body: JSON.stringify(input) });
  },
  getOrder(id: string): Promise<CustomerOrder> { return http(`/orders/${id}`); }
};

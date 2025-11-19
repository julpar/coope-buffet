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
    // Try to parse a structured API error first
    let bodyText = '';
    try { bodyText = await res.text(); } catch { bodyText = ''; }
    // 1) Attempt straight JSON parse
    try {
      const json = bodyText ? JSON.parse(bodyText) : null;
      if (json && (json.code || json.message)) {
        const err: any = new Error(json.message || `${res.status} ${res.statusText}`);
        err.status = res.status;
        err.code = json.code;
        if (json.shortages) err.shortages = json.shortages;
        throw err;
      }
    } catch {
      // 2) If parsing failed (e.g., body wrapped with extra text), try to extract the first JSON object substring
      if (bodyText && bodyText.includes('{') && bodyText.includes('}')) {
        const start = bodyText.indexOf('{');
        const end = bodyText.lastIndexOf('}');
        if (end > start) {
          try {
            const json = JSON.parse(bodyText.slice(start, end + 1));
            if (json && (json.code || json.message)) {
              const err: any = new Error(json.message || `${res.status} ${res.statusText}`);
              err.status = res.status;
              err.code = json.code;
              if (json.shortages) err.shortages = json.shortages;
              throw err;
            }
          } catch {
            // ignore and fall through
          }
        }
      }
      // fallthrough to generic error
    }
    // Fallback to a generic error with raw text preserved
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${bodyText}`);
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

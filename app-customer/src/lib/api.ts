import type { MenuResponse, CustomerOrder, OrderChannel } from '../types';
import { ref } from 'vue';
import { API_BASE as ABS_BASE } from './base';
import { platform } from './platform';
export const apiOnline = ref<boolean | null>(null);

type HttpError = Error & {
  status?: number;
  code?: string;
  shortages?: unknown;
};

function httpError(message: string, opts?: { status?: number; code?: string; shortages?: unknown }): HttpError {
  const err = new Error(message) as HttpError;
  if (opts) Object.assign(err, opts);
  return err;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const url = ABS_BASE + urlPath;
  let res: Response;
  try {
    // Just-in-time platform status check before any server communication
    // Debounced inside platform implementation to avoid bursts
    await platform.fetch();
    // If the platform is known to be in hard-offline, avoid hitting any
    // customer endpoints at all. The backend would return a 503 HTML page
    // anyway, so short‑circuit here to prevent unnecessary network noise.
    if (platform.status.value === 'hard-offline') {
      throw httpError('Servicio no disponible', { status: 503, code: 'HARD_OFFLINE' });
    }
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
    // Only consider the API "offline" for network-level issues (handled above)
    // or server errors (5xx). Do not flip the flag on 4xx business errors.
    if (res.status >= 500) apiOnline.value = false;
    // If the backend is in hard-offline, middleware returns 503 with an HTML page.
    // In that case, proactively refresh the public platform status so the UI can
    // switch to the full-screen offline overlay instead of showing raw HTML.
    if (res.status === 503) {
      try { await platform.fetch(); } catch { void 0; }
      throw httpError('Servicio no disponible', { status: 503, code: 'HARD_OFFLINE' });
    }
    // Try to parse a structured API error first
    let bodyText = '';
    try { bodyText = await res.text(); } catch { bodyText = ''; }
    // 1) Attempt straight JSON parse
    try {
      const json = bodyText ? JSON.parse(bodyText) : null;
      if (json && (json.code || json.message)) {
        throw httpError(json.message || `${res.status} ${res.statusText}`, {
          status: res.status,
          code: json.code,
          shortages: json.shortages,
        });
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
              throw httpError(json.message || `${res.status} ${res.statusText}`, {
                status: res.status,
                code: json.code,
                shortages: json.shortages,
              });
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
  // Normal JSON response
  if (ct.includes('application/json')) return res.json();

  // Some environments might return a successful response without a proper
  // content-type header. Try to read text and parse JSON heuristically.
  try {
    const bodyText = await res.text();
    const trimmed = (bodyText || '').trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed);
    }
  } catch {
    // ignore and attempt other fallbacks
    void 0;
  }

  // If there is no body, attempt to infer created resource ID from Location header (e.g., /orders/:id)
  const location = res.headers.get('location');
  if (location) {
    const m = location.match(/\/orders\/([^/?#]+)/);
    if (m && m[1]) {
      // Minimal object so callers that expect { id } (like checkout -> success redirect) keep working
      // @ts-expect-error – caller decides the exact type
      return { id: decodeURIComponent(m[1]) };
    }
  }
  return undefined;
}

export const customerApi = {
  getMenu(): Promise<MenuResponse> { return http('/menu'); },
  createOrder(input: { channel: OrderChannel; items: Array<{ id: string; qty: number }>; customerName?: string; paymentMethod?: 'online' | 'cash' }): Promise<CustomerOrder> {
    return http('/orders', { method: 'POST', body: JSON.stringify(input) });
  },
  getOrder(id: string): Promise<CustomerOrder> { return http(`/orders/${id}`); },
  getOrderByCode(code: string): Promise<CustomerOrder> { return http(`/orders/code/${encodeURIComponent(code)}`); },
  createMpPreference(orderId: string): Promise<{ preferenceId: string; initPoint: string }> {
    return http('/payments/mercadopago/preference', { method: 'POST', body: JSON.stringify({ orderId }) });
  },
  // Feedback API
  getFeedbackStatus(orderId: string): Promise<{ submitted: boolean }> { return http(`/feedback/status/${encodeURIComponent(orderId)}`); },
  submitFeedback(input: { orderId: string; ease: number; speed: number; quality: number; comment?: string }): Promise<{ ok: true }> {
    return http('/feedback', { method: 'POST', body: JSON.stringify(input) });
  },
};

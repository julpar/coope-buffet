import type { Category, Item } from '../types';
import { ref } from 'vue';

// Build absolute API base from environment variables.
// In dev, defaults to http://localhost:3000 and version v1
const SERVICE_URL_APP = import.meta.env.VITE_SERVICE_URL_APP || 'http://localhost:3000';
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

function buildBase(base: string, version: string): string {
  const trimmedBase = base.replace(/\/$/, '');
  const trimmedVer = version.replace(/^\//, '');
  return `${trimmedBase}/${trimmedVer}`;
}

const ABS_BASE = buildBase(SERVICE_URL_APP, API_VERSION);
export const API_BASE = ABS_BASE;
// Reactive API online flag: null (unknown), true (reachable), false (errors observed)
export const apiOnline = ref<boolean | null>(null);

// Reactive flag kept for backwards-compatibility with the existing banner.
// It now simply means: API is offline/unreachable (no mock data is used).
export const isApiOffline = ref<boolean>(false);

export class HttpError extends Error {
  status: number;
  statusText: string;
  bodyText?: string;
  constructor(status: number, statusText: string, message?: string) {
    super(message || `${status} ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
  }
}

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
    // Network error or CORS failure → mark offline and rethrow
    apiOnline.value = false;
    isApiOffline.value = true;
    throw e;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Do NOT mark offline for 4xx — treat as normal application errors
    if (res.status >= 500) {
      apiOnline.value = false;
      isApiOffline.value = true;
    }
    const err = new HttpError(res.status, res.statusText, `HTTP ${res.status} ${res.statusText}`);
    err.bodyText = text;
    throw err;
  }
  // Successful response: consider the API online and exit offline state
  apiOnline.value = true;
  isApiOffline.value = false;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return undefined;
}

// Note: Staff app does not consume the public customer menu directly.
// All staff features use /staff/* endpoints below.

// Helper that marks offline on network/5xx errors and rethrows (no mock fallback)
async function callApi<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const res = await fn();
    apiOnline.value = true;
    isApiOffline.value = false;
    return res;
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : undefined;
    if (!status || status >= 500) {
      apiOnline.value = false;
      isApiOffline.value = true; // reuse flag to toggle the existing offline banner
    }
    throw e;
  }
}

// All mock/localStorage functionality removed: the staff app no longer uses mock data.

// Staff API without any mock fallback. Errors will propagate and the offline banner will show.
export const staffApi = {
  getCategories: () => callApi<Category[]>(() => http('/staff/menu/categories')),
  upsertCategory: (id: string, data: Partial<Category>) =>
    callApi<Category>(() => http(`/staff/menu/categories/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) })),
  getItems: () => callApi<Item[]>(() => http('/staff/menu/items')),
  upsertItem: (id: string, data: Partial<Item>) =>
    callApi<Item>(() => http(`/staff/menu/items/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) })),
  deleteItem: (id: string) =>
    callApi<{ ok: true }>(() => http(`/staff/menu/items/${encodeURIComponent(id)}`, { method: 'DELETE' })),
  adjustStock: (id: string, delta: number) =>
    callApi<{ id: string; stock: number }>(
      () => http(`/staff/menu/items/${encodeURIComponent(id)}/stock`, { method: 'POST', body: JSON.stringify({ delta }) })
    ),
  // Orders (no fallback; banner indicates offline)
  listOrders: (state: 'pending_payment' | 'paid' | 'fulfilled' | 'all' = 'paid') =>
    callApi<any[]>(() => {
      const qs = state ? `?state=${encodeURIComponent(state)}` : '';
      return http(`/staff/orders${qs}`);
    }),
  lookupOrderByCode: (code: string) =>
    callApi<any>(() => http(`/staff/orders/lookup?code=${encodeURIComponent(code)}`)),
  markOrderPaid: (id: string, externalId?: string | null) =>
    callApi<any>(() => http(`/staff/orders/${encodeURIComponent(id)}/paid`, { method: 'POST', body: JSON.stringify({ externalId: externalId ?? null }) })),
  markOrderPaidByCode: (code: string, externalId?: string | null) =>
    callApi<any>(() => http(`/staff/orders/paid-by-code`, { method: 'POST', body: JSON.stringify({ code, externalId: externalId ?? null }) })),
  setOrderFulfillment: (id: string, fulfilled: boolean) =>
    callApi<any>(() => http(`/staff/orders/${encodeURIComponent(id)}/fulfillment`, { method: 'POST', body: JSON.stringify({ fulfilled }) })),
  cancelOrder: (id: string) =>
    callApi<any>(() => http(`/staff/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' })),
  // Images: request a presigned upload URL and upload the file, returning the public URL
  uploadImage: async (file: File): Promise<{ url: string }> => {
    // 1) Ask backend for a presigned URL
    const presigned = await http<{ uploadUrl: string; fileUrl: string }>(`/staff/upload-url`, {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' }),
    });
    // 2) Upload file directly to R2 via PUT
    const putRes = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: file.type ? { 'Content-Type': file.type } : undefined,
    });
    if (!putRes.ok) {
      const t = await putRes.text().catch(() => '');
      throw new Error(`Upload failed: ${putRes.status} ${putRes.statusText} ${t}`);
    }
    return { url: presigned.fileUrl };
  },
};

// Auth and Users management
export type StaffUser = { id: string; nickname: string; roles: string[] };

// Cache auth status for 60 seconds and coalesce concurrent requests
type AuthStatus = { adminExists: boolean; currentUser: StaffUser | null };
let _authCached: AuthStatus | null = null;
let _authCachedAt = 0;
let _authInFlight: Promise<AuthStatus> | null = null;

async function getAuthStatus(force = false): Promise<AuthStatus> {
  const now = Date.now();
  const fresh = now - _authCachedAt < 60_000; // 60 seconds TTL
  if (!force && _authCached && fresh) return _authCached;
  if (!force && _authInFlight) return _authInFlight;
  const p = http<AuthStatus>(`/auth/status`)
    .then((res) => {
      _authCached = res;
      _authCachedAt = Date.now();
      return res;
    })
    .finally(() => {
      _authInFlight = null;
    });
  if (!force) _authInFlight = p;
  return p;
}

export const authApi = {
  // Returns cached status if fresh (< 60s). Pass { force: true } to bypass cache.
  status: (opts?: { force?: boolean }) => getAuthStatus(!!opts?.force),
  initAdmin: (nickname: string, password?: string) => http<{ ok: true; user: StaffUser }>(`/auth/init-admin`, {
    method: 'POST',
    body: JSON.stringify({ nickname, password }),
  }),
  // Initiate session from permanent token delivered via URL (param name: token)
  perm: (token: string) => http<{ ok: true; user: StaffUser }>(`/auth/perm?token=${encodeURIComponent(token)}`),
  // Logout current session (server clears cookie)
  logout: () => http<void>(`/auth/logout`, { method: 'POST' }),
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
  // Get permanent login URL for an existing user (ADMIN only)
  getPermUrl: (id: string) => http<{ permUrl: string }>(`/staff/users/${encodeURIComponent(id)}/perm-url`),
};

// Platform status (global kill switch)
export type PlatformStatus = 'online' | 'soft-offline' | 'hard-offline';
export type PlatformStatusResponse = {
  status: PlatformStatus;
  message: string;
  offlineUntil: number | null;
  paymentMethods: Array<'online' | 'cash'>;
  mpAllowedPaymentTypes?: Array<'account_money' | 'credit_card' | 'debit_card' | 'prepaid_card'>;
};

export const platformApi = {
  // Public endpoint, available to everyone
  getPublicStatus: () => http<PlatformStatusResponse>(`/platform/status`),
  // Admin-only staff endpoints
  getStaffStatus: () => http<PlatformStatusResponse>(`/staff/platform/status`),
  setStatus: (data: {
    status: PlatformStatus;
    message?: string;
    offlineUntil?: number | null;
    paymentMethods?: Array<'online' | 'cash'>;
    mpAllowedPaymentTypes?: Array<'account_money' | 'credit_card' | 'debit_card' | 'prepaid_card'>;
  }) =>
    http<PlatformStatusResponse & { ok: true }>(`/staff/platform/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Background probe on startup to eagerly detect backend availability and show the banner early.
// Uses the public platform status endpoint.
if (typeof window !== 'undefined') {
  fetch(ABS_BASE + '/platform/status', { method: 'GET' })
    .then((r) => {
      if (!r.ok) throw new Error('unavailable');
      apiOnline.value = true;
      isApiOffline.value = false;
    })
    .catch(() => {
      apiOnline.value = false;
      isApiOffline.value = true;
    });
}

// Backwards-compatible named exports expected by some components
// These simply proxy to the staffApi methods.
export function getStaffItems() {
  return staffApi.getItems();
}
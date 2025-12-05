import { ref } from 'vue';
import { API_BASE } from './base';

type Status = 'online' | 'soft-offline' | 'hard-offline';

export const platform = {
  status: ref<Status>('online'),
  message: ref<string>(''),
  offlineUntil: ref<number | null>(null),
  paymentMethods: ref<Array<'online' | 'cash'>>(['online', 'cash']),
  _inFlight: null as Promise<void> | null,
  async fetch() {
    // Coalesce concurrent calls to avoid duplicate requests
    if (platform._inFlight) return platform._inFlight;
    platform._inFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/platform/status`);
        const data = await res.json();
        platform.status.value = data.status as Status;
        platform.message.value = data.message || '';
        platform.offlineUntil.value = data.offlineUntil ?? null;
        const pm = Array.isArray(data.paymentMethods) ? data.paymentMethods : ['online','cash'];
        platform.paymentMethods.value = pm.filter((m: any) => m === 'online' || m === 'cash');
      } catch { void 0; }
    })().finally(() => {
      platform._inFlight = null;
    });
    return platform._inFlight;
  },
};

import { ref } from 'vue';
import { API_BASE } from './api';

type Status = 'online' | 'soft-offline' | 'hard-offline';

export const platform = {
  status: ref<Status>('online'),
  message: ref<string>(''),
  offlineUntil: ref<number | null>(null),
  _timer: null as any,
  async fetch() {
    try {
      const res = await fetch(`${API_BASE}/platform/status`);
      const data = await res.json();
      platform.status.value = data.status as Status;
      platform.message.value = data.message || '';
      platform.offlineUntil.value = data.offlineUntil ?? null;
    } catch {}
  },
  start() {
    platform.fetch();
    clearInterval(platform._timer);
    platform._timer = setInterval(platform.fetch, 3000);
  },
  stop() { clearInterval(platform._timer); }
};

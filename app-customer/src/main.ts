import { createApp, ref, onMounted } from 'vue';

const App = {
  setup() {
    const status = ref<'online' | 'soft-offline' | 'hard-offline'>('online');
    const message = ref('');
    const offlineUntil = ref<number | null>(null);

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/platform/status');
        const data = await res.json();
        status.value = data.status;
        message.value = data.message || '';
        offlineUntil.value = data.offlineUntil ?? null;
      } catch {
        // ignore
      }
    };

    onMounted(() => {
      fetchStatus();
      setInterval(fetchStatus, 3000);
    });

    return { status, message, offlineUntil };
  },
  template: `: sticky;top:0;background:#111;color:#fff;padding:12px 16px;">
      <strong>Buffet</strong>
      <span v-if="status==='soft-offline'" style="background:#ff9800;color:#111;padding:4px 8px;border-radius:8px;margin-left:8px;">Pausa temporal</span>
    </header>

    <main style="padding:16px">
      <p>Bienvenido. Esta es una versión inicial de la app del cliente.</p>
      <p>Explorá el menú (placeholder) y armá tu pedido.</p>
    </main>

    <div v-if="status==='soft-offline'" style="position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;color:#fff;">
      <div style="text-align:center;max-width:560px;padding:24px">
        <h2 style="margin:0 0 8px">Estamos en pausa momentánea</h2>
        <p style="opacity:.9">{{ message || 'Volvemos en unos minutos.' }}</p>
        <button disabled style="margin-top:12px;padding:10px 16px;border:0;border-radius:8px;background:#555;color:#ccc">Finalizar pedido deshabilitado</button>
      </div>
    </div>
  </div>
  `
};

createApp(App).mount('#app');

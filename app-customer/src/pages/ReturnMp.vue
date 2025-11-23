<template>
  <div class="return-mp">
    <h2>Procesando pago…</h2>
    <div v-if="loading" class="muted">Redirigiendo a tu pedido…</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="muted">Listo. Si no fuiste redirigido automáticamente, <a href="#" @click.prevent="go">seguí acá</a>.</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { customerApi } from '../lib/api';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref('');
let targetId: string | null = null;

function go() {
  if (targetId) router.replace(`/success/${encodeURIComponent(targetId)}`);
}

onMounted(async () => {
  try {
    // MercadoPago sometimes sends duplicated query params (e.g., external_reference twice)
    // Vue Router represents duplicates as an array; also, some proxies join as comma-separated.
    // Normalize by picking the first non-empty value and, if comma-separated, the first token.
    function pickRef(val: any): string {
      let raw = '';
      if (Array.isArray(val)) {
        raw = val.find((v) => !!String(v || '').trim()) ?? '';
      } else {
        raw = String(val || '');
      }
      raw = raw.trim();
      if (raw.includes(',')) {
        const first = raw.split(',').map((s) => s.trim()).find(Boolean) || '';
        return first;
      }
      return raw;
    }

    const externalRef = pickRef(route.query.external_reference) || pickRef(route.query.externalReference);
    if (!externalRef) {
      error.value = 'No pudimos identificar tu pedido. Volvé al menú e intentá nuevamente.';
      return;
    }
    // Resolve order by shortcode and navigate to the standard success page
    const order = await customerApi.getOrderByCode(externalRef);
    targetId = order.id as unknown as string;
    await router.replace(`/success/${encodeURIComponent(targetId)}`);
  } catch (e: any) {
    error.value = e?.message || 'No se pudo recuperar el pedido.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.return-mp { display: flex; flex-direction: column; gap: 8px; }
.muted { color: #666; }
.error { color: #b71c1c; }
</style>

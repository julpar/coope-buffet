<template>
  <div class="success">
    <h2>Pedido generado</h2>
    <div v-if="loading" class="muted">Cargando…</div>
    <div v-else-if="!order" class="error">No se encontró el pedido.</div>
    <div v-else class="content">
      <p>Mostrá este QR al personal para validar el pago en efectivo.</p>
      <div class="qr">
        <img :src="qrSrc" alt="QR del pedido" />
      </div>
      <div class="sum">
        <div><strong>Código:</strong> {{ order.shortCode }}</div>
        <div class="muted" style="font-size:12px;">ID: {{ order.id }}</div>
        <div><strong>Total:</strong> {{ currency(order.total) }}</div>
        <div><strong>Estado:</strong> {{ order.status }}</div>
      </div>
      <a href="/" @click.prevent="onBackClick">Volver al menú</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { CustomerOrder } from '../types';
import { customerApi } from '../lib/api';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const order = ref<CustomerOrder | null>(null);
const qrSrc = ref('');

function currency(cents: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cents / 100);
}

onMounted(async () => {
  try {
    const id = String(route.params.id || '');
    const o = await customerApi.getOrder(id);
    order.value = o;
    // Encode the same input expected by Cajero (app-staff): the short alphanumeric order code.
    // Cashier scans either a plain short code or a URL with ?code=...; we provide the plain short code for maximum compatibility.
    const data = String(o.shortCode || '');
    qrSrc.value = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
  } catch {
    order.value = null;
  } finally {
    loading.value = false;
  }
});

function onBackClick() {
  // Warn the customer that returning to the menu will drop the cart/order
  // This avoids losing a potentially paid order without explicit consent.
  const status = order.value?.status || '';
  const msg =
    '¿Seguro que querés volver al menú?\n' +
    'Se perderá el carrito y el pedido actual' +
    (status ? ` (estado: ${status})` : '') +
    '.\nSi ya realizaste el pago, el pedido también se perderá.';
  if (window.confirm(msg)) {
    router.push('/');
  }
}
</script>

<style scoped>
.success { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.muted { color: #666; }
.error { color: #b71c1c; }
.content { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.qr img { width: 260px; height: 260px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.sum { display: grid; gap: 4px; text-align: center; }
</style>

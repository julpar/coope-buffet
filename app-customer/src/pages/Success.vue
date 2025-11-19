<template>
  <div class="success">
    <h2>Pedido generado</h2>
    <div v-if="loading" class="muted">Cargando…</div>
    <div v-else-if="!order" class="error">No se encontró el pedido.</div>
    <div v-else class="content">
      <!-- QR primero -->
      <div class="qr-wrap" v-if="qrSrc">
        <img :src="qrSrc" alt="QR del pedido" class="qr" />
        <div class="qr-hint">Escaneá este QR en caja o mostrá el código manual.</div>
      </div>

      <!-- Estado prominente con esquema de color -->
      <div class="status-banner" :class="statusClass(order.status)" v-if="order.status">
        <div class="status-title">{{ statusLabel(order.status) }}</div>
        <div class="status-desc">{{ statusDescription(order.status) }}</div>
      </div>

      <!-- Resto de la descripción/detalles debajo del QR -->
      <p>Guardá tu código de pedido. Mostralo al personal para continuar.</p>
      <div class="sum">
        <div><strong>Código:</strong> {{ order.shortCode }}</div>
        <div><strong>Total:</strong> {{ currency(order.total) }}</div>
      </div>
      <!-- Actions -->
      <div class="actions">
        <!-- If order is fulfilled, encourage starting a new one -->
        <n-button v-if="order.status === 'fulfilled'" type="primary" @click="goToMenu">
          Crear nuevo pedido
        </n-button>

        <!-- If order is pending payment, allow cancel (navigate away) with confirmation -->
        <n-button
          v-else-if="order.status === 'pending_payment'"
          type="error"
          tertiary
          @click="onCancelClick"
        >
          Cancelar pedido
        </n-button>

        <!-- If order is paid, do NOT cancel; show a big warning and allow explicit leave -->
        <div v-else-if="order.status === 'paid'" class="paid-warning">
          <div class="warn-title">⚠️ ¡Atención!</div>
          <div>
            Este pedido ya está marcado como <strong>pagado</strong>. Si salís de esta
            pantalla y perdés el código, el pedido se puede <strong>perder para siempre</strong>.
          </div>
          <n-button quaternary type="warning" @click="goToMenu" style="margin-top:8px;">
            Entiendo, volver al menú
          </n-button>
        </div>

        <!-- Fallback action for any other state -->
        <n-button v-else quaternary @click="goToMenu">Volver al menú</n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { CustomerOrder } from '../types';
import { customerApi } from '../lib/api';
import { statusLabel, statusDescription } from '../lib/status';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const order = ref<CustomerOrder | null>(null);
const qrSrc = ref('');
let pollTimer: number | null = null;
let pollDeadline = 0; // epoch ms when we should stop polling

// Backend now returns monetary values in whole ARS (not cents).
// Show the number as-is without dividing by 100.
function currency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

onMounted(async () => {
  try {
    const id = String(route.params.id || '');
    const o = await customerApi.getOrder(id);
    order.value = o;
    // Generamos un QR escaneable por "Cajero":
    // El lector acepta URLs con ?code=SHORT o el bloque alfanumérico puro.
    const code = o?.shortCode || o?.id;
    if (code) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const data = origin ? `${origin}/?code=${encodeURIComponent(code)}` : String(code);
      qrSrc.value = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(data)}`;
    } else {
      qrSrc.value = '';
    }

    // Si el pedido quedó en pendiente de pago, iniciar polling por 20 minutos máx, cada 3s.
    if (o && o.status === 'pending_payment') {
      startPolling(id);
    }
  } catch {
    order.value = null;
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => stopPolling());

function startPolling(id: string) {
  stopPolling();
  // 20 minutos máximo
  pollDeadline = Date.now() + 20 * 60 * 1000;
  const tick = async () => {
    // cortar si excede deadline o componente desmontado
    if (Date.now() >= pollDeadline) { stopPolling(); return; }
    try {
      const fresh = await customerApi.getOrder(id);
      order.value = fresh;
      // detener al salir de pendiente (pagado/fulfilled/cancelado)
      if (fresh.status !== 'pending_payment') {
        stopPolling();
        return;
      }
    } catch {
      // Silenciar errores de red transitorios y seguir intentando hasta deadline
    }
    // programar próxima verificación en ~3s
    // window.setTimeout devuelve number en browsers
    pollTimer = window.setTimeout(tick, 3000);
  };
  pollTimer = window.setTimeout(tick, 3000);
}

function stopPolling() {
  if (pollTimer != null) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function onBackClick() {
  // Warn the customer that returning to the menu will drop the cart/order
  // This avoids losing a potentially paid order without explicit consent.
  const status = order.value?.status || '';
  const msg =
    '¿Seguro que querés volver al menú?\n' +
    'Se perderá el carrito y el pedido actual' +
    (status ? ` (estado: ${statusLabel(status)})` : '') +
    '.\nSi ya realizaste el pago, el pedido también se perderá.';
  if (window.confirm(msg)) {
    router.push('/');
  }
}

// New explicit actions for buttons
function goToMenu() {
  router.push('/');
}

function onCancelClick() {
  // For now we don't call backend cancel; leaving the page is equivalent for the flow
  const confirmed = window.confirm(
    '¿Cancelar el pedido y volver al menú?\nPerderás el código de este pedido y será descartado.'
  );
  if (confirmed) goToMenu();
}

// Map status to banner color classes
function statusClass(status?: CustomerOrder['status'] | string | null): string {
  const st = String(status || '');
  if (st === 'pending_payment') return 'is-pending';
  if (st === 'paid') return 'is-paid';
  if (st === 'fulfilled') return 'is-fulfilled';
  if (st === 'cancelled') return 'is-cancelled';
  return 'is-default';
}
</script>

<style scoped>
.success { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.muted { color: #666; }
.error { color: #b71c1c; }
.content { display: flex; flex-direction: column; gap: 12px; align-items: center; }
.sum { display: grid; gap: 4px; text-align: center; }
.qr-wrap { display:flex; flex-direction:column; align-items:center; gap:6px; margin-top: 4px; }
.qr { width: 320px; height: 320px; border:1px solid #eee; border-radius:8px; background:#fff; }
.qr-hint { font-size: 12px; color:#666; }
/* Prominent status banner styles */
.status-banner { width: 100%; max-width: 520px; border-radius: 10px; padding: 10px 12px; border: 1px solid transparent; text-align: left; }
.status-title { font-weight: 700; margin-bottom: 2px; }
.status-desc { font-size: 13px; }
.is-pending { background: #fff8e1; border-color: #ffe082; color: #6d4c00; }
.is-paid { background: #e3f2fd; border-color: #90caf9; color: #0d47a1; }
.is-fulfilled { background: #e8f5e9; border-color: #a5d6a7; color: #1b5e20; }
.is-cancelled { background: #ffebee; border-color: #ef9a9a; color: #b71c1c; }
.is-default { background: #f5f5f5; border-color: #e0e0e0; color: #333; }
@media (max-width: 480px) {
  .qr { width: 240px; height: 240px; }
}
.actions { margin-top: 8px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.paid-warning { border: 2px solid #f5c542; background: #fff8e1; color: #6d4c00; padding: 12px; border-radius: 8px; max-width: 440px; text-align: center; }
.warn-title { font-weight: 700; margin-bottom: 4px; }
</style>

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

      <!-- Código manual destacado (alternativa al QR) -->
      <div class="manual-code" v-if="order.shortCode">
        <div class="code-label">Código</div>
        <div class="code-value" :aria-label="`Código ${order.shortCode}`">{{ order.shortCode }}</div>
        <n-button size="small" tertiary class="copy-btn" @click="copyCode">
          Copiar
        </n-button>
      </div>

      <!-- Resto de la descripción/detalles debajo del QR -->
      <p>Guardá tu código de pedido. Mostralo al personal para continuar.</p>
      <div class="sum">
        <div><strong>Total:</strong> {{ currency(order.total) }}</div>
      </div>
      <!-- Actions -->
      <div class="actions">
        <!-- If order is already fulfilled, it's safe to promote a new one -->
        <n-button v-if="order.status === 'fulfilled'" type="primary" @click="goToMenu">
          Crear nuevo pedido
        </n-button>

        <!-- If order is pending payment or paid (unfulfilled), de-emphasize and offer to cancel -->
        <n-button
          v-else-if="order.status === 'pending_payment' || order.status === 'paid'"
          type="error"
          tertiary
          @click="onCancelClick"
        >
          {{ order.status === 'paid' ? 'Abandonar pedido' : 'Cancelar pedido' }}
        </n-button>

        <!-- Fallback action for any other state -->
        <n-button v-else quaternary @click="goToMenu">Volver al menú</n-button>
      </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, h } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import type { CustomerOrder } from '../types';
import { customerApi } from '../lib/api';
import { statusLabel, statusDescription } from '../lib/status';
import { createDiscreteApi } from 'naive-ui';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const order = ref<CustomerOrder | null>(null);
const qrSrc = ref('');
let pollTimer: number | null = null;
let pollDeadline = 0; // epoch ms when we should stop polling
// Local flag to allow programmatic navigation without showing the paid warning twice
const allowLeave = ref(false);
// Feedback when copying the manual code
const { message } = createDiscreteApi(['message']);

// Discrete dialog for nicer confirmations (no provider required here)
const { dialog } = createDiscreteApi(['dialog']);

function confirmDialog(opts: { title: string; content: any; positiveText?: string; negativeText?: string }): Promise<boolean> {
  return new Promise((resolve) => {
    const d = dialog.warning({
      title: opts.title,
      // Naive UI expects content as a render function. If a VNode is provided,
      // wrap it so the body actually renders (otherwise it shows nothing).
      content: typeof opts.content === 'function' ? opts.content : () => opts.content,
      positiveText: opts.positiveText ?? 'Sí',
      negativeText: opts.negativeText ?? 'No',
      closable: true,
      maskClosable: false,
      onPositiveClick: () => { resolve(true); },
      onNegativeClick: () => { resolve(false); },
      onClose: () => { resolve(false); }
    });
    void d; // ensure allocated
  });
}

function paidLeaveContent() {
  return h('div', { style: 'display:flex; flex-direction:column; gap:8px;' }, [
    h('p', { style: 'margin:0' }, '¡Atención! Este pedido ya figura como PAGADO.'),
    h('p', { style: 'margin:0' }, 'Si salís de esta pantalla, el pedido se perderá y no podrá canjearse.'),
    // Explicit refund reminder for paid orders
    h('p', { style: 'margin:0; color:#b00020;' }, 'El reintegro, en caso de corresponder, deberá solicitarse manualmente a los organizadores.'),
    h('p', { style: 'margin:0; font-weight:700;' }, '¿Seguro que querés salir y volver al menú?')
  ]);
}

function abandonOrderContent() {
  return h('div', { style: 'display:flex; flex-direction:column; gap:8px;' }, [
    h('p', { style: 'margin:0; font-weight:700;' }, '¿Abandonar el pedido y volver al menú?'),
    h('p', { style: 'margin:0' }, 'Este pedido está PAGADO. Si lo abandonás, se perderá y no podrá canjearse.'),
    h('p', { style: 'margin:0; color:#b00020;' }, 'El reintegro deberá reclamarse manualmente a los organizadores.')
  ]);
}

function cancelOrderContent() {
  return h('div', { style: 'display:flex; flex-direction:column; gap:8px;' }, [
    h('p', { style: 'margin:0; font-weight:700;' }, '¿Cancelar el pedido y volver al menú?'),
    h('p', { style: 'margin:0' }, 'Perderás el código de este pedido y será descartado.')
  ]);
}

// Backend now returns monetary values in whole ARS (not cents).
// Show the number as-is without dividing by 100.
function currency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

async function copyCode() {
  const code = order.value?.shortCode || '';
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    message.success('Código copiado');
  } catch {
    // Fallback para navegadores sin permiso/soporte
    const ok = window.prompt('Copiá el código manualmente:', code);
    void ok;
  }
}

onMounted(async () => {
  try {
    const id = String(route.params.id || '');
    const o = await customerApi.getOrder(id);
    order.value = o;
    // Generamos el QR de "cumplimiento" (y caja) REUTILIZANDO el mismo código corto
    // usado para pagar. No debe ser una URL, solo el código alfanumérico.
    const code = o?.shortCode || o?.id;
    if (code) {
      // Importante: el data del QR debe ser únicamente el código, sin URL.
      qrSrc.value = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
        String(code)
      )}`;
    } else {
      qrSrc.value = '';
    }

    // Si el pedido quedó en pendiente de pago o pagado (pendiente de preparación),
    // iniciar polling por 20 minutos máx, cada 3s. Para 'paid' seguimos hasta fulfilled/cancelled.
    if (o && (o.status === 'pending_payment' || o.status === 'paid')) {
      startPolling(id);
    }
  } catch {
    order.value = null;
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => stopPolling());

// Global-ish protection: if the current order is PAID and the user tries to leave
// this screen (go back to menú, cart, or anywhere else), show a strong warning.
// This also covers browser Back/Forward actions.
onBeforeRouteLeave(async () => {
  const st = order.value?.status;
  if (st === 'paid' && !allowLeave.value) {
    const ok = await confirmDialog({
      title: 'Pedido pagado',
      content: paidLeaveContent(),
      positiveText: 'Salir igualmente',
      negativeText: 'Quedarme'
    });
    if (!ok) return false; // cancelar navegación
  }
  return true;
});

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
      // Continuar mientras esté en 'pending_payment' o 'paid'.
      // Considerar final cuando pase a 'fulfilled' o 'cancelled'.
      if (fresh.status === 'fulfilled' || fresh.status === 'cancelled') {
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

async function onCancelClick() {
  // For now we don't call backend cancel; leaving the page is equivalent for the flow
  // Refresh order just-in-time to ensure we show the correct wording (paid vs pending)
  try {
    const currId = String(order.value?.id || route.params.id || '');
    if (currId) {
      const fresh = await customerApi.getOrder(currId);
      if (fresh) order.value = fresh as any;
    }
  } catch {}
  const st = order.value?.status;
  const isPaid = st === 'paid';
  const confirmed = await confirmDialog({
    title: isPaid ? 'Abandonar pedido' : 'Cancelar pedido',
    content: isPaid ? abandonOrderContent() : cancelOrderContent(),
    positiveText: isPaid ? 'Entiendo y acepto' : 'Cancelar y volver',
    negativeText: 'Seguir en este pedido'
  });
  if (confirmed) {
    // Avoid double confirmation when the order is paid and the route guard is active
    if (isPaid) allowLeave.value = true;
    goToMenu();
    // Reset the flag shortly after navigation so future leaves still warn
    if (isPaid) setTimeout(() => { allowLeave.value = false; }, 500);
  }
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
/* Manual code — big and highly visible */
.manual-code { position: relative; display: flex; align-items: center; gap: 10px; background: #111; color: #fff; padding: 10px 12px; border-radius: 12px; border: 2px solid #000; box-shadow: 0 2px 10px rgba(0,0,0,.15); }
.manual-code .code-label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; opacity: .8; }
.manual-code .code-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-weight: 800; font-size: 40px; line-height: 1; letter-spacing: .06em; padding: 6px 10px; background: #fff; color: #111; border-radius: 8px; border: 2px solid #000; min-width: 6ch; text-align: center; }
.manual-code .copy-btn { position: relative; }
@media (max-width: 480px) {
  .manual-code { padding: 8px 10px; gap: 8px; }
  .manual-code .code-value { font-size: 32px; padding: 4px 8px; }
}
/* Print-friendly: ensure the code stays very visible */
@media print {
  .qr-wrap { display: none !important; }
  .manual-code { border-color: #000; background: #fff; color: #000; box-shadow: none; }
  .manual-code .code-value { color: #000; border-color: #000; background: #fff; }
}
@media (max-width: 480px) {
  .qr { width: 240px; height: 240px; }
}
.actions { margin-top: 8px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.paid-warning { border: 2px solid #f5c542; background: #fff8e1; color: #6d4c00; padding: 12px; border-radius: 8px; max-width: 440px; text-align: center; }
.warn-title { font-weight: 700; margin-bottom: 4px; }
</style>

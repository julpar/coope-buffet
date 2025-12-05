<template>
  <div
    class="success"
    :inert="showFeedback"
  >
    <h2
      ref="pageTitleRef"
      tabindex="-1"
    >
      Pedido generado
    </h2>
    <div
      v-if="loading"
      class="muted"
    >
      Cargando…
    </div>
    <div
      v-else-if="!order"
      class="error"
    >
      No se encontró el pedido.
    </div>
    <div
      v-else
      class="content"
    >
      <!-- QR primero -->
      <div
        v-if="qrSrc"
        class="qr-wrap"
      >
        <img
          :src="qrSrc"
          alt="QR del pedido"
          class="qr"
        >
        <div class="qr-hint">
          Escaneá este QR en caja o mostrá el código manual.
        </div>
      </div>

      <!-- Estado prominente con esquema de color -->
      <div
        v-if="order.status"
        class="status-banner"
        :class="statusClass(order.status)"
      >
        <div class="status-title">
          {{ statusLabel(order.status) }}
        </div>
        <div class="status-desc">
          {{ statusDescription(order.status) }}
        </div>
      </div>

      <!-- Código manual destacado (alternativa al QR) -->
      <div
        v-if="order.shortCode"
        class="manual-code"
      >
        <div class="code-label">
          Código
        </div>
        <div
          class="code-value"
          :aria-label="`Código ${order.shortCode}`"
        >
          {{ order.shortCode }}
        </div>
        <n-button
          size="small"
          quaternary
          class="copy-btn"
          @click="copyCode"
        >
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
        <n-button
          v-if="order.status === 'fulfilled'"
          type="primary"
          @click="goToMenu"
        >
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
        <n-button
          v-else
          quaternary
          @click="goToMenu"
        >
          Volver al menú
        </n-button>
      </div>
    </div>

    <!-- Feedback modal -->
    <n-modal
      v-model:show="showFeedback"
      preset="card"
      :mask-closable="false"
      :closable="false"
      :trap-focus="false"
      :block-scroll="true"
      style="max-width:520px;width:90vw"
    >
      <template #header>
        <strong
          ref="fbHeaderRef"
          tabindex="-1"
        >Tu opinión</strong>
      </template>
      <div
        v-if="feedbackStep === 1"
        class="fb-wrap"
      >
        <p class="fb-intro">
          Calificá tu experiencia
        </p>
        <div class="fb-row">
          <div class="fb-label">
            Facilidad
          </div>
          <n-rate
            v-model:value="ease"
            size="large"
            :count="5"
            :allow-half="false"
          />
        </div>
        <div class="fb-row">
          <div class="fb-label">
            Velocidad
          </div>
          <n-rate
            v-model:value="speed"
            size="large"
            :count="5"
            :allow-half="false"
          />
        </div>
        <div class="fb-row">
          <div class="fb-label">
            Calidad
          </div>
          <n-rate
            v-model:value="quality"
            size="large"
            :count="5"
            :allow-half="false"
          />
        </div>
        <div class="fb-actions">
          <n-button
            type="primary"
            :disabled="!canContinue"
            @click="onFeedbackContinue"
          >
            Continuar
          </n-button>
        </div>
      </div>
      <div
        v-else
        class="fb-wrap"
      >
        <p class="fb-intro">
          Contanos lo que salió mal
        </p>
        <n-input
          v-model:value="comment"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 6 }"
          placeholder="Escribí tu comentario"
        />
        <div class="fb-actions">
          <n-button
            tertiary
            @click="skipComment"
          >
            Omitir
          </n-button>
          <n-button
            type="primary"
            :loading="submitting"
            @click="submitFeedback"
          >
            Enviar
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, h, watch, computed, nextTick, type VNode } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import type { CustomerOrder } from '../types';
import { customerApi } from '../lib/api';
import { statusLabel, statusDescription } from '../lib/status';
import { createDiscreteApi } from 'naive-ui';
// Local QR generation (no external service)
import { useQRCode } from '@vueuse/integrations/useQRCode';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const order = ref<CustomerOrder | null>(null);
// QR code data URL generated locally. We feed it with the short alphanumeric code only.
const qrData = ref('');
const qrSrc = useQRCode(qrData, {
  width: 320,
  margin: 1,
  errorCorrectionLevel: 'M'
});
let pollTimer: number | null = null;
let pollDeadline = 0; // epoch ms when we should stop polling
// Local flag to allow programmatic navigation without showing the paid warning twice
const allowLeave = ref(false);
// Feedback when copying the manual code
const { message } = createDiscreteApi(['message']);

// Discrete dialog for nicer confirmations (no provider required here)
const { dialog } = createDiscreteApi(['dialog']);

function confirmDialog(opts: { title: string; content: VNode | (() => VNode); positiveText?: string; negativeText?: string }): Promise<boolean> {
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
    // Importante: el data del QR debe ser únicamente el código, sin URL.
    qrData.value = code ? String(code) : '';

    // Si el pedido quedó en pendiente de pago o pagado (pendiente de preparación),
    // iniciar polling por 20 minutos máx, cada 3s. Para 'paid' seguimos hasta fulfilled/cancelled.
    if (o && (o.status === 'pending_payment' || o.status === 'paid')) {
      startPolling(id);
    }
    // If already fulfilled on load, try to show feedback
    if (o && o.status === 'fulfilled') {
      void maybePromptFeedback(o.id);
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
        if (fresh.status === 'fulfilled') {
          void maybePromptFeedback(fresh.id);
        }
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
      if (fresh) order.value = fresh;
    }
  } catch { void 0; }
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

// --- Feedback modal logic ---
const showFeedback = ref(false);
const fbHeaderRef = ref<HTMLElement | null>(null);
const pageTitleRef = ref<HTMLElement | null>(null);
const feedbackStep = ref<1 | 2>(1);
const ease = ref(0);
const speed = ref(0);
const quality = ref(0);
const comment = ref('');
const submitting = ref(false);

const canContinue = computed(() => ease.value > 0 && speed.value > 0 && quality.value > 0);

// --- Feedback persistence helpers ---
type FbState = {
  state: 'open' | 'submitted' | 'dismissed';
  step: 1 | 2;
  ease: number;
  speed: number;
  quality: number;
  comment?: string;
  ts: number;
};
function fbKey(orderId: string) { return `fb:state:${orderId}`; }
function loadFbState(orderId: string): FbState | null {
  try {
    const raw = localStorage.getItem(fbKey(orderId));
    return raw ? (JSON.parse(raw) as FbState) : null;
  } catch { return null; }
}
function saveFbState(orderId: string, s: FbState) {
  try { localStorage.setItem(fbKey(orderId), JSON.stringify(s)); } catch { void 0; }
}
function setFbSubmitted(orderId: string) {
  saveFbState(orderId, {
    state: 'submitted',
    step: 1,
    ease: 0,
    speed: 0,
    quality: 0,
    comment: '',
    ts: Date.now(),
  });
}

async function maybePromptFeedback(orderId: string) {
  try {
    // 1) If backend says it's already submitted, persist that and stop
    const st = await customerApi.getFeedbackStatus(orderId);
    if (st?.submitted) { setFbSubmitted(orderId); return; }

    // 2) Restore local state if present and not completed/dismissed
    const loc = loadFbState(orderId);
    if (loc && (loc.state === 'submitted' || loc.state === 'dismissed')) return;

    if (loc && loc.state === 'open') {
      feedbackStep.value = loc.step;
      ease.value = loc.ease;
      speed.value = loc.speed;
      quality.value = loc.quality;
      comment.value = loc.comment || '';
    } else {
      feedbackStep.value = 1;
      ease.value = speed.value = quality.value = 0;
      comment.value = '';
    }
    showFeedback.value = true;
    // persist as open right away so a reload will re-open it with selections
    saveFbState(orderId, {
      state: 'open',
      step: feedbackStep.value,
      ease: ease.value,
      speed: speed.value,
      quality: quality.value,
      comment: comment.value,
      ts: Date.now(),
    });
  } catch {
    // ignore network errors silently
  }
}

function onFeedbackContinue() {
  const avg = (ease.value + speed.value + quality.value) / 3;
  if (avg < 3) {
    feedbackStep.value = 2;
  } else {
    // Submit immediately without comment
    submitFeedback();
  }
}

function skipComment() {
  submitFeedback();
}

async function submitFeedback() {
  if (!order.value) return;
  try {
    submitting.value = true;
    await customerApi.submitFeedback({
      orderId: order.value.id,
      ease: ease.value,
      speed: speed.value,
      quality: quality.value,
      comment: comment.value?.trim() || undefined,
    });
    showFeedback.value = false;
    message.success('¡Gracias por tu opinión!');
    // Mark as submitted so we don't prompt again on reload
    setFbSubmitted(order.value.id);
  } catch {
    // If already submitted, just close
    showFeedback.value = false;
  } finally {
    submitting.value = false;
  }
}

// Prevent aria-hidden/focus conflict by managing focus manually when modal toggles
watch(showFeedback, async (open) => {
  if (open) {
    // Blur any focused element before the modal applies aria-hidden to background
    const el = document.activeElement as HTMLElement | null;
    if (el && typeof el.blur === 'function') el.blur();
    await nextTick();
    // Move focus into the modal header for accessibility
    fbHeaderRef.value?.focus();
    // Persist current state as open
    if (order.value) {
      saveFbState(order.value.id, {
        state: 'open',
        step: feedbackStep.value,
        ease: ease.value,
        speed: speed.value,
        quality: quality.value,
        comment: comment.value,
        ts: Date.now(),
      });
    }
  } else {
    // Restore focus to the page title after closing the modal
    await nextTick();
    pageTitleRef.value?.focus();
  }
});

// Persist user selections live while the modal stays open so they survive reloads
watch([ease, speed, quality, comment, feedbackStep], () => {
  if (!showFeedback.value || !order.value) return;
  saveFbState(order.value.id, {
    state: 'open',
    step: feedbackStep.value,
    ease: ease.value,
    speed: speed.value,
    quality: quality.value,
    comment: comment.value,
    ts: Date.now(),
  });
});
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
/* Make the quaternary (text-like) copy button readable on dark background */
.manual-code .copy-btn { color: rgba(255, 255, 255, 0.85); }
.manual-code .copy-btn:hover,
.manual-code .copy-btn:focus { color: #fff; }
.manual-code .copy-btn:focus-visible { outline: 2px solid #66afe9; outline-offset: 2px; border-radius: 6px; }
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
/* Feedback modal styles */
.fb-wrap { display:flex; flex-direction: column; gap: 12px; }
.fb-intro { margin: 0; font-weight: 600; }
.fb-row { display:flex; align-items:center; justify-content: space-between; gap: 8px; }
.fb-label { min-width: 100px; }
.fb-actions { display:flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
</style>

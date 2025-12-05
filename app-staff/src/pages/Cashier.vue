<template>
  <div
    class="cashier"
    :class="{ focus: !!order }"
  >
    <h2>Cajero</h2>

    <!-- Single-operation workstation: big input + live scanner -->
    <n-card
      v-if="!order"
      size="small"
      class="scanner-card minimal"
    >
      <div class="scan-row">
        <div class="scan-left">
          <div class="field-row big">
            <n-input
              v-model:value="manualCode"
              size="large"
              placeholder="Código del pedido"
              maxlength="12"
              @keydown.enter.prevent="lookup"
            />
            <n-button
              size="large"
              type="primary"
              :disabled="!canLookup"
              :loading="loading"
              @click="lookup"
            >
              Buscar
            </n-button>
          </div>
          <small class="hint">Escanea el QR o escribe el código.</small>
        </div>
        <div class="scan-right">
          <div class="video-wrap">
            <video
              ref="videoEl"
              autoplay
              playsinline
              muted
            />
            <div class="overlay">
              {{ scanning ? 'Escaneando…' : 'Escanear QR' }}
            </div>
          </div>
          <div class="scan-actions">
            <n-button
              size="large"
              tertiary
              @click="toggleScan"
            >
              {{ scanning ? 'Detener cámara' : 'Usar cámara' }}
            </n-button>
            <small
              v-if="!barcodeSupported"
              class="hint"
            >El lector de QR no está disponible; usa el código manual.</small>
          </div>
        </div>
      </div>
    </n-card>

    <n-card
      v-if="order"
      class="order-card focus-only"
      :title="'Pedido ' + order.id"
    >
      <div
        v-if="!isPayable"
        class="prominent-warning"
      >
        <n-alert
          type="warning"
          title="No se puede cobrar este pedido"
          :show-icon="true"
        >
          <div
            class="warn-text"
            style="font-weight: 700; font-size: 18px; letter-spacing: .5px;"
          >
            YA SE ENCUENTRA PAGO
          </div>
        </n-alert>
      </div>
      <div class="order-summary">
        <div class="row big-code">
          <strong>Código:</strong> <span class="code">{{ order.shortCode }}</span>
        </div>
        <div class="row">
          <strong>Subtotal:</strong> <span class="money">{{ peso(subtotal) }}</span>
        </div>
        <div
          v-if="order.total && order.total !== subtotal"
          class="row"
        >
          <strong>Total:</strong> <span class="money">{{ peso(order.total) }}</span>
        </div>
      </div>
      <div class="items">
        <div
          v-for="it in order.items"
          :key="it.id"
          class="item"
        >
          <span class="qty">x{{ it.qty }}</span>
          <span class="name">{{ it.name || it.id }}</span>
          <span class="price">{{ peso((it.unitPrice || 0) * (it.qty || 0)) }}</span>
        </div>
      </div>
      <template #action>
        <n-space>
          <n-button
            size="large"
            strong
            secondary
            @click="clearOrder"
          >
            Cancelar
          </n-button>
          <n-button
            size="large"
            strong
            type="primary"
            class="cta-pay"
            :loading="marking"
            :disabled="order.status !== 'pending_payment'"
            @click="markPaid"
          >
            MARCAR PAGADO
          </n-button>
        </n-space>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';
import { useMessage } from 'naive-ui';
import { staffApi } from '../lib/api';

type Order = any; // use backend shape

const msg = useMessage();
const manualCode = ref('');
const loading = ref(false);
const marking = ref(false);
const order = ref<Order | null>(null);

// Money formatting: backend/client prices are in ARS currency units (not cents)
function peso(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount || 0);
}

// Camera/QR
const videoEl = ref<HTMLVideoElement | null>(null);
const scanning = ref(false);
const barcodeSupported = 'BarcodeDetector' in window;
let bd: any = null;
let rafId: number | null = null;
let mediaStream: MediaStream | null = null;

const canLookup = ref(false);

function normalizeCode(c: string): string {
  return (c || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function lookup() {
  const code = normalizeCode(manualCode.value);
  if (!code) return;
  loading.value = true;
  try {
    const o = await staffApi.lookupOrderByCode(code);
    order.value = o;
    if (o) stopScan();
    if (o?.status !== 'pending_payment') {
      msg.warning('El pedido no está pendiente de pago.');
    }
  } catch {
    msg.error('No se encontró el pedido para ese código.');
    order.value = null;
  } finally {
    loading.value = false;
  }
}

async function markPaid() {
  if (!order.value) return;
  marking.value = true;
  try {
    const code = order.value.shortCode as string;
    const o = await staffApi.markOrderPaidByCode(code);
    order.value = o;
    msg.success('Pago registrado. Enviado a preparación.');
    // Prepare immediately for the next customer
    resetForNext(true);
  } catch {
    msg.error('No se pudo marcar como pagado.');
  } finally {
    marking.value = false;
  }
}

function clearOrder() { order.value = null; }

function stopScan() {
  scanning.value = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
}

async function startScan() {
  if (!barcodeSupported) return;
  try {
    // @ts-ignore
    bd = new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    // Safari behind flag etc.
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoEl.value) videoEl.value.srcObject = mediaStream;
    scanning.value = true;
    tick();
  } catch {
    // Permission denied; ignore
  }
}

function parseCodeFromText(text: string): string | null {
  // Try URL param code=?
  try {
    const u = new URL(text);
    const q = u.searchParams.get('code');
    if (q) return normalizeCode(q);
  } catch {}
  // Fallback: find 6-10 alphanum block likely code
  const m = text.toUpperCase().match(/[A-Z0-9]{6,10}/);
  return m ? normalizeCode(m[0]) : null;
}

async function tick() {
  if (!scanning.value || !bd || !videoEl.value) return;
  try {
    const dets = await bd.detect(videoEl.value);
    if (dets && dets.length) {
      const raw = dets[0].rawValue || dets[0].raw || '';
      const code = parseCodeFromText(String(raw) || '');
      if (code) {
        manualCode.value = code;
        await lookup();
        stopScan();
        return;
      }
    }
  } catch {}
  rafId = requestAnimationFrame(tick);
}

function toggleScan() {
  if (scanning.value) stopScan(); else startScan();
}

onMounted(() => {
  canLookup.value = true;
  // Auto-start scanner for faster workflow
  if (barcodeSupported) startScan();
});

onBeforeUnmount(() => {
  stopScan();
});

// Hotkeys removidos: se eliminan atajos de teclado globales para simplificar la UI

function resetForNext(restartScan = false) {
  // Clear UI shortly after success to continue with next order
  setTimeout(() => {
    manualCode.value = '';
    clearOrder();
    if (restartScan && barcodeSupported) startScan();
  }, 800);
}

// Subtotal for focused view (currency units)
const subtotal = computed(() => {
  const o = order.value as any;
  if (!o?.items) return 0;
  return o.items.reduce((sum: number, it: any) => sum + (it.unitPrice || 0) * (it.qty || 1), 0);
});

// Payable and humanized status for UI
const isPayable = computed(() => (order.value?.status === 'pending_payment'));
</script>

<style scoped>
.cashier { display: flex; flex-direction: column; gap: 16px; }
.cashier.focus .scanner-card { display: none; }
.scanner-card.minimal :deep(.n-card__content) { padding-top: 12px; }
.scan-row { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
/* Stack input above camera on medium screens too (same as narrow displays) */
@media (max-width: 1280px) {
  .scan-row { grid-template-columns: 1fr; }
}
.field-row { display:flex; gap:8px; align-items:center; }
.field-row.big :deep(.n-input) { font-size: 20px; }
.field-row.big :deep(.n-input__input-el) { height: 56px; }
.field-row.big :deep(.n-button) { height: 56px; font-size: 18px; padding: 0 22px; }
.hint { color: #666; }
.video-wrap { position: relative; width: 100%; aspect-ratio: 1/1; background: #000; border-radius: 8px; overflow: hidden; }
.video-wrap video { width: 100%; height: 100%; object-fit: cover; }
.overlay { position:absolute; inset:auto 0 0 0; color:#fff; text-align:center; background: linear-gradient(transparent, rgba(0,0,0,0.6)); padding: 10px 12px; font-size: 14px; letter-spacing: .2px; }
.order-card { }
.order-card.focus-only :deep(.n-card-header__main) { font-size: 18px; }
.order-summary { display:flex; flex-wrap: wrap; gap: 16px; margin-bottom: 8px; }
.order-summary .row { min-width: 140px; }
.order-summary .big-code .code { font-size: 24px; font-weight: 700; }
.code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; letter-spacing: 1px; }
.items { border-top: 1px solid #eee; margin-top: 8px; padding-top: 8px; display:flex; flex-direction:column; gap:6px; }
.item { display:grid; grid-template-columns: auto 1fr auto; gap:8px; align-items:center; }
.qty { font-weight: 600; }
.price { opacity: 0.8 }
.money { font-weight: 700; font-size: 18px; }
.cta-pay { font-size: 18px; padding: 0 28px; }
.prominent-warning { margin-bottom: 12px; }
.prominent-warning :deep(.n-alert) { border: 1px solid #f7c566; }
.warn-text { margin-bottom: 6px; }
.warn-text .status { font-weight: 700; }
</style>

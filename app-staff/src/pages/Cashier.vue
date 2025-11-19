<template>
  <div class="cashier">
    <h2>Cajero · Cobrar pedido</h2>

    <n-card size="small" class="scanner-card">
      <div class="scan-row">
        <div class="scan-left">
          <div class="field-row">
            <n-input v-model:value="manualCode" placeholder="Código de 6 caracteres" maxlength="12" @keydown.enter.prevent="lookup" />
            <n-button type="primary" :disabled="!canLookup" :loading="loading" @click="lookup">Buscar</n-button>
          </div>
          <small class="hint">Puedes escribir el código corto que muestra el cliente. Ej: 6 letras/números legibles.</small>
        </div>
        <div class="scan-right">
          <div class="video-wrap">
            <video ref="videoEl" autoplay playsinline muted></video>
            <div class="overlay">Escanea QR</div>
          </div>
          <div class="scan-actions">
            <n-button size="small" @click="toggleScan">{{ scanning ? 'Detener cámara' : 'Usar cámara' }}</n-button>
            <small class="hint" v-if="!barcodeSupported">Tu navegador no soporta lector de QR; usa el código manual.</small>
          </div>
        </div>
      </div>
    </n-card>

    <n-card v-if="order" class="order-card" :title="'Pedido ' + order.id">
      <div class="order-summary">
        <div class="row"><strong>Código:</strong> <span class="code">{{ order.shortCode }}</span></div>
        <div class="row"><strong>Estado:</strong> <span>{{ order.status }}</span></div>
        <div class="row"><strong>Canal:</strong> <span>{{ order.channel }}</span></div>
        <div class="row"><strong>Total:</strong> <span>${{ (order.total/100).toFixed(2) }}</span></div>
      </div>
      <div class="items">
        <div class="item" v-for="it in order.items" :key="it.id">
          <span class="qty">x{{ it.qty }}</span>
          <span class="name">{{ it.name || it.id }}</span>
          <span class="price">${{ ((it.unitPrice*it.qty)/100).toFixed(2) }}</span>
        </div>
      </div>
      <template #action>
        <n-space>
          <n-button secondary @click="clearOrder">Cancelar</n-button>
          <n-button type="primary" :loading="marking" @click="markPaid" :disabled="order.status !== 'pending_payment'">MARCAR PAGADO</n-button>
        </n-space>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { staffApi } from '../lib/api';

type Order = any; // use backend shape

const msg = useMessage();
const manualCode = ref('');
const loading = ref(false);
const marking = ref(false);
const order = ref<Order | null>(null);

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
    if (o?.status !== 'pending_payment') {
      msg.warning('El pedido no está pendiente de pago.');
    }
  } catch (e: any) {
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
  } catch (e: any) {
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
  } catch (e) {
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
});

onBeforeUnmount(() => {
  stopScan();
});
</script>

<style scoped>
.cashier { display: flex; flex-direction: column; gap: 16px; }
.scanner-card { }
.scan-row { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
@media (max-width: 900px) {
  .scan-row { grid-template-columns: 1fr; }
}
.field-row { display:flex; gap:8px; align-items:center; }
.hint { color: #666; }
.video-wrap { position: relative; width: 100%; aspect-ratio: 1/1; background: #000; border-radius: 8px; overflow: hidden; }
.video-wrap video { width: 100%; height: 100%; object-fit: cover; }
.overlay { position:absolute; inset:auto 0 0 0; color:#fff; text-align:center; background: linear-gradient(transparent, rgba(0,0,0,0.6)); padding: 6px 8px; font-size: 12px; }
.order-card { }
.order-summary { display:flex; flex-wrap: wrap; gap: 16px; margin-bottom: 8px; }
.order-summary .row { min-width: 140px; }
.code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; letter-spacing: 1px; }
.items { border-top: 1px solid #eee; margin-top: 8px; padding-top: 8px; display:flex; flex-direction:column; gap:6px; }
.item { display:grid; grid-template-columns: auto 1fr auto; gap:8px; align-items:center; }
.qty { font-weight: 600; }
.price { opacity: 0.8 }
</style>

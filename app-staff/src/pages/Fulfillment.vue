<template>
  <div class="fulfillment" :class="{ focus: !!order }">
    <h2>Entrega</h2>

    <!-- Scanner / code entry when no order loaded -->
    <n-card v-if="!order" size="small" class="scanner-card minimal">
      <div class="scan-row">
        <div class="scan-left">
          <div class="field-row big">
            <n-input size="large" v-model:value="manualCode" placeholder="Código del pedido" maxlength="12" @keydown.enter.prevent="lookup" />
            <n-button size="large" type="primary" :disabled="!canLookup" :loading="loading" @click="lookup">Buscar</n-button>
          </div>
          <small class="hint">Escanea el QR o escribe el código. Solo se pueden completar pedidos PAGADOS.</small>
        </div>
        <div class="scan-right">
          <div class="video-wrap">
            <video ref="videoEl" autoplay playsinline muted></video>
            <div class="overlay">{{ scanning ? 'Escaneando…' : 'Escanear QR' }}</div>
          </div>
          <div class="scan-actions">
            <n-button size="large" tertiary @click="toggleScan">{{ scanning ? 'Detener cámara' : 'Usar cámara' }}</n-button>
            <small class="hint" v-if="!barcodeSupported">El lector de QR no está disponible; usa el código manual.</small>
          </div>
        </div>
      </div>
    </n-card>

    <!-- Order loaded -->
    <n-card v-if="order" class="order-card focus-only" :title="'Pedido ' + order.id">
      <div v-if="!isFulfillable" class="prominent-warning">
        <n-alert type="warning" title="No se puede completar este pedido" :show-icon="true">
          <div class="warn-text" style="font-weight: 700; font-size: 18px; letter-spacing: .5px;">
            NO ESTA LISTO PARA ENTREGAR
          </div>
        </n-alert>
      </div>
      <div class="order-summary">
        <div class="row big-code"><strong>Código:</strong> <span class="code">{{ order.shortCode }}</span></div>
        <div class="row"><strong>Cliente:</strong> <span>{{ order.customerName || '-' }}</span></div>
        <div class="row"><strong>Estado:</strong> <n-tag :type="order.status === 'paid' ? 'info' : order.status === 'fulfilled' ? 'success' : 'warning'">{{ statusLabel }}</n-tag></div>
      </div>
      <!-- Stock warning banner if any item is flagged -->
      <div v-if="hasStockWarnings" class="prominent-warning">
        <n-alert type="warning" title="Posible problema de stock" :show-icon="true">
          Uno o más artículos podrían no estar disponibles. Seguí el protocolo manual: verificar stock,
          ofrecer reemplazo o realizar reembolso parcial según corresponda.
        </n-alert>
      </div>
      <div class="items">
        <div class="items-header">
          <div class="items-title">Artículos del pedido</div>
          <div class="items-total" :aria-label="'Total de unidades: ' + totalItems">
            <span class="total-number">{{ totalItems }}</span>
            <span class="total-label">unidades</span>
          </div>
        </div>

        <!-- Pending (not yet checked) items on top -->
        <div class="subsection-header" v-if="pendingItems.length">
          <span class="subsection-title">Pendientes</span>
          <span class="subsection-count">{{ pendingItems.length }}</span>
        </div>
        <div
          class="item"
          v-for="it in pendingItems"
          :key="'p-'+it.id"
          :class="{ checked: isItemChecked(it.id), 'dragging': isDragging(it.id), 'swipe-right': dragDx > 0 && draggingId === String(it.id), 'swipe-left': dragDx < 0 && draggingId === String(it.id) }"
          role="button"
          :aria-pressed="isItemChecked(it.id)"
          tabindex="0"
          @click="(e) => onItemClick(it.id, e)"
          @keydown.enter.prevent="() => toggleItemChecked(it.id, !isItemChecked(it.id))"
          @keydown.space.prevent="() => toggleItemChecked(it.id, !isItemChecked(it.id))"
          @pointerdown="(e) => onItemPointerDown(it.id, e)"
          @pointermove="(e) => onItemPointerMove(it.id, e)"
          @pointerup="(e) => onItemPointerUp(it.id, e)"
          @pointercancel="() => onItemPointerCancel(it.id)"
          :style="rowStyle(it.id)"
        >
          <span class="qty" :title="'Cantidad'">x{{ it.qty }}</span>
          <span class="name" style="display:inline-flex; align-items:center; gap:8px;">
            {{ it.name || it.id }}
            <n-tag v-if="it.stockWarning" size="small" type="warning">Posible problema de stock</n-tag>
          </span>
        </div>

        <!-- Checked items moved under a secondary section and greyed out -->
        <div class="subsection-header muted" v-if="checkedItems.length">
          <span class="subsection-title">Comprobados</span>
          <span class="subsection-count">{{ checkedItems.length }}</span>
        </div>
        <div
          class="item checked"
          v-for="it in checkedItems"
          :key="'c-'+it.id"
          role="button"
          :aria-pressed="true"
          tabindex="0"
          @click="(e) => onItemClick(it.id, e, true)"
          @keydown.enter.prevent="() => toggleItemChecked(it.id, false)"
          @keydown.space.prevent="() => toggleItemChecked(it.id, false)"
          @pointerdown="(e) => onItemPointerDown(it.id, e)"
          @pointermove="(e) => onItemPointerMove(it.id, e)"
          @pointerup="(e) => onItemPointerUp(it.id, e)"
          @pointercancel="() => onItemPointerCancel(it.id)"
          :style="rowStyle(it.id)"
        >
          <span class="qty" :title="'Cantidad'">x{{ it.qty }}</span>
          <span class="name" style="display:inline-flex; align-items:center; gap:8px;">
            {{ it.name || it.id }}
            <n-tag v-if="it.stockWarning" size="small" type="warning">Posible problema de stock</n-tag>
          </span>
        </div>
      </div>
      <template #action>
        <n-space>
          <n-button size="large" strong secondary @click="clearOrder">Cancelar</n-button>
          <n-button size="large" strong type="primary" class="cta-fulfill" :loading="marking" @click="markFulfilled" :disabled="!isFulfillable">MARCAR COMPLETADO</n-button>
        </n-space>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, NTag } from 'naive-ui';
import { staffApi } from '../lib/api';

type Order = any;

const msg = useMessage();
const manualCode = ref('');
const loading = ref(false);
const marking = ref(false);
const order = ref<Order | null>(null);
const route = useRoute();
const router = useRouter();

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
    // Reflect loaded order in the URL so the view is refreshable/shareable
    if (o) {
      const urlCode = normalizeCode(o?.shortCode || code);
      router.replace({ name: 'fulfillment', query: { code: urlCode } });
    }
    if (o?.status !== 'paid') {
      msg.warning('El pedido no está pagado. Solo los pedidos pagados pueden completarse.');
    }
  } catch (e: any) {
    msg.error('No se encontró el pedido para ese código.');
    order.value = null;
  } finally {
    loading.value = false;
  }
}

const isFulfillable = computed(() => !!order.value && order.value.status === 'paid');
// True if any line item is flagged with a probable stock problem
const hasStockWarnings = computed(() => {
  const items = (order.value?.items ?? []) as Array<any>;
  return items.some((it) => !!it?.stockWarning);
});
const statusLabel = computed(() => {
  const st = order.value?.status;
  if (st === 'pending_payment') return 'Pago pendiente';
  if (st === 'paid') return 'Pagada';
  if (st === 'fulfilled') return 'Completada';
  return String(st || '');
});

// Total number of item units to hand to the customer
const totalItems = computed(() => {
  const items = (order.value?.items ?? []) as Array<{ qty?: number }>
  return items.reduce((sum, it) => sum + (Number(it?.qty) || 0), 0)
});

// Local aid: per-line "checked" state while fulfilling (ephemeral; not persisted)
const checkedLineIds = ref<Set<string>>(new Set());

function resetChecks() {
  checkedLineIds.value = new Set();
}

function isItemChecked(id: string | number) {
  return checkedLineIds.value.has(String(id));
}

function toggleItemChecked(id: string | number, checked: boolean) {
  const key = String(id);
  const set = new Set(checkedLineIds.value);
  if (checked) set.add(key); else set.delete(key);
  checkedLineIds.value = set;
}

const pendingItems = computed(() => {
  const items = (order.value?.items ?? []) as Array<any>;
  return items.filter((it) => !isItemChecked(it.id));
});

const checkedItems = computed(() => {
  const items = (order.value?.items ?? []) as Array<any>;
  return items.filter((it) => isItemChecked(it.id));
});

async function markFulfilled() {
  if (!order.value) return;
  if (!isFulfillable.value) {
    msg.warning('Solo puede completarse un pedido pagado.');
    return;
  }
  marking.value = true;
  try {
    await staffApi.setOrderFulfillment(order.value.id, true);
    msg.success('Pedido marcado como COMPLETADO.');
    // Update local state for visual feedback
    order.value = { ...(order.value as any), status: 'fulfilled' };
    // Auto-clear after a short delay to continue workflow
    setTimeout(() => clearOrder(), 400);
  } catch (e: any) {
    msg.error('No se pudo marcar como completado.');
  } finally {
    marking.value = false;
  }
}

function clearOrder() {
  order.value = null;
  manualCode.value = '';
  resetChecks();
  startScan();
  // Clear URL query so a refresh returns to scanner state
  router.replace({ name: 'fulfillment', query: {} });
}

// Atajos de teclado eliminados para simplificar la UI

function updateLookupState() {
  const c = normalizeCode(manualCode.value);
  canLookup.value = !!c && c.length >= 6;
}

function stopScan() {
  scanning.value = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
}

async function startScan() {
  if (!barcodeSupported) return;
  try {
    bd = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoEl.value) videoEl.value.srcObject = mediaStream;
    scanning.value = true;
    const loop = async () => {
      if (!videoEl.value || !bd) return;
      try {
        const dets = await bd.detect(videoEl.value);
        const raw = dets?.[0]?.rawValue as string | undefined;
        if (raw) {
          manualCode.value = normalizeCode(raw);
          updateLookupState();
          await lookup();
        }
      } catch {}
      if (scanning.value) rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  } catch {
    // ignore; user may block camera
  }
}

function toggleScan() {
  if (scanning.value) stopScan(); else startScan();
}

onMounted(async () => {
  updateLookupState();
  // If a code is present in the URL, auto-load it instead of starting the scanner
  const qCode = normalizeCode(String(route.query.code || ''));
  if (qCode) {
    manualCode.value = qCode;
    updateLookupState();
    await lookup();
    // If lookup didn't load an order (invalid code), fall back to scanner and clean URL
    if (!order.value) {
      router.replace({ name: 'fulfillment', query: {} });
      startScan();
    }
  } else {
    startScan();
  }
});
onBeforeUnmount(() => {
  stopScan();
});

// Keep lookup state in sync
watchEffect(updateLookupState);

// Reset checks when a new order is loaded or the id changes
watchEffect(() => {
  const id = (order.value as any)?.id;
  // whenever id changes (or order becomes null), reset
  void id; // reference to track dependency
  resetChecks();
});

// --- Mobile-first gestures (tap + swipe) for checking items ---
// State for drag/swipe interactions
const draggingId = ref<string | null>(null);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragDx = ref(0);
const dragDy = ref(0);
const dragActive = ref(false);
const suppressNextClickForId = ref<string | null>(null);

// Thresholds
const DRAG_ACTIVATE_PX = 6; // start tracking horizontal drag after this
const DRAG_VERTICAL_CANCEL_PX = 18; // allow vertical scroll to cancel
const SWIPE_ACTION_PX = 60; // commit action beyond this distance

function isDragging(id: string | number) {
  return dragActive.value && draggingId.value === String(id);
}

function onItemClick(id: string | number, e: MouseEvent | PointerEvent, isCurrentlyChecked?: boolean) {
  const key = String(id);
  if (suppressNextClickForId.value === key) {
    // Click resulted from a swipe release; ignore
    suppressNextClickForId.value = null;
    return;
  }
  // Simple tap toggles
  toggleItemChecked(id, !(isCurrentlyChecked ?? isItemChecked(id)));
  // Gentle haptic if available
  try { (navigator as any).vibrate?.(10); } catch {}
}

function onItemPointerDown(id: string | number, e: PointerEvent) {
  // Only react to primary button / touch
  if (e.button !== 0) return;
  const key = String(id);
  draggingId.value = key;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  dragDx.value = 0;
  dragDy.value = 0;
  dragActive.value = false;
  // capture pointer to keep receiving events even if cursor leaves element
  try { (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId); } catch {}
}

function onItemPointerMove(id: string | number, e: PointerEvent) {
  if (draggingId.value !== String(id)) return;
  const dx = e.clientX - dragStartX.value;
  const dy = e.clientY - dragStartY.value;
  dragDx.value = dx;
  dragDy.value = dy;
  if (!dragActive.value) {
    if (Math.abs(dy) > DRAG_VERTICAL_CANCEL_PX) {
      // user is scrolling vertically; cancel drag
      onItemPointerCancel(id);
      return;
    }
    if (Math.abs(dx) > DRAG_ACTIVATE_PX && Math.abs(dy) < DRAG_VERTICAL_CANCEL_PX) {
      dragActive.value = true;
    }
  }
}

function onItemPointerUp(id: string | number, e: PointerEvent) {
  if (draggingId.value !== String(id)) return;
  const key = String(id);
  const dx = dragDx.value;
  const absDx = Math.abs(dx);
  const wasDragging = dragActive.value;
  // reset dragging visuals
  draggingId.value = null;
  dragActive.value = false;
  // If we dragged beyond threshold, perform directional action
  if (wasDragging && absDx >= SWIPE_ACTION_PX) {
    const dirRight = dx > 0;
    if (dirRight) {
      // swipe right → mark checked
      if (!isItemChecked(id)) toggleItemChecked(id, true);
    } else {
      // swipe left → uncheck
      if (isItemChecked(id)) toggleItemChecked(id, false);
    }
    // prevent the following click from toggling again
    suppressNextClickForId.value = key;
    setTimeout(() => {
      if (suppressNextClickForId.value === key) suppressNextClickForId.value = null;
    }, 200);
    try { (navigator as any).vibrate?.(10); } catch {}
  }
  // Reset deltas after frame (let style transition back)
  requestAnimationFrame(() => { dragDx.value = 0; dragDy.value = 0; });
}

function onItemPointerCancel(id: string | number) {
  if (draggingId.value !== String(id)) return;
  draggingId.value = null;
  dragActive.value = false;
  requestAnimationFrame(() => { dragDx.value = 0; dragDy.value = 0; });
}

function rowStyle(id: string | number) {
  const isCurr = draggingId.value === String(id) && dragActive.value;
  const x = isCurr ? dragDx.value : 0;
  return {
    transform: `translate3d(${x}px, 0, 0)`,
  } as Record<string, string>;
}
</script>

<style scoped>
.fulfillment { display: flex; flex-direction: column; gap: 16px; }
.fulfillment.focus .scanner-card { display: none; }
.scanner-card.minimal { background: #fff; }
/* Match Cashier layout and sizing for scanner section */
.scanner-card.minimal :deep(.n-card__content) { padding-top: 12px; }
.scan-row { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
.scan-left { flex: 1; display:flex; flex-direction:column; gap: 6px; }
.field-row.big { display:flex; gap:8px; align-items:center; }
.field-row.big :deep(.n-input) { font-size: 20px; }
.field-row.big :deep(.n-input__input-el) { height: 56px; }
.field-row.big :deep(.n-button) { height: 56px; font-size: 18px; padding: 0 22px; }
.scan-right { width: auto; display:flex; flex-direction:column; gap:8px; }
.video-wrap { position: relative; width: 100%; aspect-ratio: 1/1; background: #000; border-radius: 8px; overflow: hidden; }
.video-wrap video { width: 100%; height: 100%; object-fit: cover; }
.overlay { position:absolute; inset:auto 0 0 0; color:#fff; text-align:center; background: linear-gradient(transparent, rgba(0,0,0,0.6)); padding: 10px 12px; font-size: 14px; letter-spacing: .2px; }
.order-card.focus-only { background: #fff; }
.order-summary { display:flex; flex-direction:column; gap:6px; margin-bottom: 8px; }
.order-summary .row { display:flex; gap:8px; align-items:center; }
.order-summary .big-code .code { font-size: 20px; letter-spacing: 2px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.items { display:flex; flex-direction:column; gap:10px; padding-top: 12px; border-top: 1px dashed rgba(0,0,0,.08); }
.items-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 2px; }
.items-title { font-weight: 700; font-size: 16px; letter-spacing: .2px; color:#111; }
.items-total { display:flex; align-items:baseline; gap:6px; }
.items-total .total-number { font-size: 22px; font-weight: 800; background:#111; color:#fff; line-height: 1; padding:6px 10px; border-radius: 999px; min-width: 40px; text-align: center; }
.items-total .total-label { color:#555; font-size: 12px; text-transform: uppercase; letter-spacing: .6px; }
.item { display:grid; grid-template-columns: 56px 1fr; gap:12px; align-items:center; font-size: 16px; padding:10px 0; border-bottom: 1px solid rgba(0,0,0,.04); min-height: 56px; touch-action: pan-y; user-select: none; -webkit-tap-highlight-color: transparent; }
.item:last-child { border-bottom: 0; }
.qty { color:#0b5; font-weight: 800; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: rgba(0,187,85,.1); border: 1px solid rgba(0,187,85,.35); border-radius: 10px; padding: 2px 8px; display:inline-block; text-align:center; }
.name { font-weight: 600; }
.item.checked { opacity: .6; }
.item.checked .name { text-decoration: line-through; }
.item { transition: transform .15s ease-out; }
.item.dragging { transition: none; }
.item.swipe-right { background: linear-gradient(90deg, rgba(0,187,85,.12), transparent 60%); }
.item.swipe-left { background: linear-gradient(270deg, rgba(230, 0, 57, .12), transparent 60%); }
.items-header { position: sticky; top: 0; background: #fff; padding-top: 6px; z-index: 1; }
.cta-fulfill { min-height: 44px; }
.subsection-header { display:flex; align-items:center; justify-content:space-between; margin-top: 6px; color:#222; }
.subsection-header .subsection-title { font-weight: 700; font-size: 14px; letter-spacing: .2px; }
.subsection-header .subsection-count { font-weight: 700; background:#f2f3f5; color:#333; border-radius: 999px; padding: 2px 8px; font-size: 12px; }
.subsection-header.muted { color:#666; }
/* Stack input above camera on medium screens too (same as narrow displays) */
@media (max-width: 1280px) {
  .scan-row { grid-template-columns: 1fr; }
  .scan-right { width: auto; }
}
</style>

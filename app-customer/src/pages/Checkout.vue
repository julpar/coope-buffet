<template>
  <div class="checkout">
    <h2>Finalizar pedido</h2>
    <!-- Soft-offline notice: if status flips while here, block flow and inform -->
    <n-alert
      v-if="isSoftOffline"
      type="warning"
      title="Pausa momentánea"
      class="soft-note"
    >
      <div>Por ahora no podés finalizar el pedido. {{ offlineMsg }}</div>
      <small
        v-if="platform.offlineUntil"
        class="muted"
      >Hasta: {{ new Date(platform.offlineUntil).toLocaleString() }}</small>
    </n-alert>
    <div
      v-if="items.length === 0"
      class="empty"
    >
      <div class="muted">
        No hay items en el carrito.
      </div>
      <n-button
        size="small"
        type="tertiary"
        @click="goHome"
      >
        Volver al menú
      </n-button>
    </div>
    <div
      v-else
      class="content"
    >
      <!-- Steps header -->
      <div class="steps">
        <div
          class="step"
          :class="{ active: step===1 }"
        >
          1. Datos
        </div>
        <div class="sep" />
        <div
          class="step"
          :class="{ active: step===2 }"
        >
          2. Confirmación
        </div>
      </div>

      <!-- Step 1: ask name -->
      <template v-if="step === 1">
        <section class="details">
          <h3>Tu nombre</h3>
          <n-form label-placement="top">
            <n-form-item label="Tu nombre (opcional)">
              <n-input
                v-model:value="customerName"
                placeholder="Ej: Juan"
                @keyup.enter="goNext"
              />
            </n-form-item>
          </n-form>
          <div class="actions">
            <n-button
              tertiary
              @click="goHome"
            >
              Volver
            </n-button>
            <n-button
              type="primary"
              :disabled="isSoftOffline"
              :title="isSoftOffline ? 'La plataforma está en pausa momentánea' : ''"
              @click="goNext"
            >
              Siguiente
            </n-button>
          </div>
        </section>
      </template>

      <!-- Step 2: review + confirm -->
      <template v-else>
        <section class="review">
          <h3>Resumen</h3>
          <div class="list">
            <div
              v-for="it in items"
              :key="it.id"
              class="row"
            >
              <div class="name">
                {{ it.name }} <small class="muted">x{{ it.qty }}</small>
              </div>
              <div class="price">
                {{ currency(it.unitPrice * it.qty) }}
              </div>
            </div>
          </div>
          <div class="total">
            <div>Total</div>
            <div class="price">
              {{ currency(subtotal) }}
            </div>
          </div>
        </section>

        <section class="pay">
          <h3>Pago</h3>
          <p class="muted">
            Elegí cómo querés pagar.
          </p>
          <div class="actions stack">
            <!-- Main option: MercadoPago (only render if method is available) -->
            <n-button
              v-if="canPayOnline"
              class="mp-button big-button"
              type="primary"
              :loading="loading"
              :disabled="items.length===0 || isSoftOffline"
              :title="isSoftOffline ? 'La plataforma está en pausa momentánea' : ''"
              @click="placeOrderMp"
            >
              <div class="mp-btn">
                <img
                  src="/images/mp_logo.png"
                  alt=""
                  aria-hidden="true"
                  class="mp-logo"
                >
                <span class="mp-label">Pagar con Mercado Pago</span>
              </div>
            </n-button>
            <!-- Secondary: efectivo/manual (only render if method is available)
                 Highlight as primary when it is the ONLY available method (cash-only) -->
            <n-button
              v-if="canPayCash"
              class="big-button"
              :type="!canPayOnline ? 'primary' : 'default'"
              :secondary="!!canPayOnline"
              :loading="loading"
              :disabled="items.length===0 || isSoftOffline"
              :title="isSoftOffline ? 'La plataforma está en pausa momentánea' : ''"
              @click="placeOrder"
            >
              Pago Manual por Caja
            </n-button>
            <!-- Empty state when no payment method is available -->
            <div
              v-if="!canPayOnline && !canPayCash"
              class="muted"
            >
              Por el momento no hay métodos de pago disponibles.
            </div>
            <!-- Back button at the bottom, same size -->
            <n-button
              class="big-button"
              tertiary
              @click="step=1"
            >
              Atrás
            </n-button>
          </div>
          <div
            v-if="error"
            class="error"
          >
            {{ error }}
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { cart } from '../lib/cart';
import { customerApi } from '../lib/api';
import { platform } from '../lib/platform';
import { handleInsufficientStock } from '../lib/stockShortage';

const router = useRouter();
const items = computed(() => cart.items.value);
const subtotal = computed(() => cart.subtotal.value);
const customerName = ref('');
const loading = ref(false);
const error = ref('');
// Two-step flow: 1) ask name, 2) review and confirm
const step = ref<1|2>(1);
// prevent auto-redirect during active submission flow
const suppressEmptyRedirect = ref(false);

const isSoftOffline = computed(() => platform.status.value === 'soft-offline');
const offlineMsg = computed(() => platform.message.value || 'Volvemos en unos minutos.');
const canPayOnline = computed(() => (platform.paymentMethods.value || []).includes('online'));
const canPayCash = computed(() => (platform.paymentMethods.value || []).includes('cash'));

// Monetary values are provided in ARS units (not cents)
function currency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

function goHome() {
  router.replace('/');
}

function goNext() {
  // Name is optional, so we can continue directly
  step.value = 2;
}

// If cart is empty on entering checkout, gently send the user back to the menu
onMounted(() => {
  if (items.value.length === 0) {
    // small delay to avoid flicker and ensure router is ready
    setTimeout(() => {
      if (!suppressEmptyRedirect.value) router.replace('/');
    }, 0);
  }
});

// Also react to the cart becoming empty (e.g., after external clear)
watch(items, (list) => {
  if (list.length === 0 && !loading.value && !suppressEmptyRedirect.value) {
    router.replace('/');
  }
});

async function placeOrder() {
  loading.value = true; error.value = '';
  suppressEmptyRedirect.value = true;
  try {
    // Last-moment check to avoid submitting during pause
    await platform.fetch();
    if (platform.status.value === 'soft-offline') {
      error.value = 'Estamos en pausa momentánea. Intentá de nuevo en unos minutos.';
      return;
    }
    if (!canPayCash.value) {
      error.value = 'El pago en efectivo está deshabilitado temporalmente.';
      return;
    }
    const res = await customerApi.createOrder({
      // Only pickup is supported as ordering modality
      channel: 'pickup',
      items: cart.toOrderItems(),
      customerName: customerName.value || undefined,
      paymentMethod: 'cash'
    });
    // Navigate to success FIRST to avoid the checkout empty-cart watcher
    // interfering when we clear the cart. Once we're on success, it's safe to clear.
    const id = res.id;
    await router.replace(`/success/${id}`);
    cart.clear();
  } catch (e: unknown) {
    // Centralized handling for stock shortages
    if (handleInsufficientStock(e, router)) return;
    const msg = e instanceof Error ? e.message : String((e as { message?: unknown })?.message || '');
    error.value = msg || 'No se pudo crear el pedido.';
  } finally {
    loading.value = false;
    suppressEmptyRedirect.value = false;
  }
}

async function placeOrderMp() {
  loading.value = true; error.value = '';
  suppressEmptyRedirect.value = true;
  try {
    await platform.fetch();
    if (platform.status.value === 'soft-offline') {
      error.value = 'Estamos en pausa momentánea. Intentá de nuevo en unos minutos.';
      return;
    }
    if (!canPayOnline.value) {
      error.value = 'El pago online está deshabilitado temporalmente.';
      return;
    }
    // 1) Create pending order (online)
    const order = await customerApi.createOrder({
      channel: 'pickup',
      items: cart.toOrderItems(),
      customerName: customerName.value || undefined,
      paymentMethod: 'online'
    });
    // 2) Ask backend for a MercadoPago preference
    const pref = await customerApi.createMpPreference(order.id);
    // 3) Clear cart and redirect to MP Checkout Pro
    cart.clear();
    window.location.href = pref.initPoint;
  } catch (e: unknown) {
    // Centralized handling for stock shortages
    if (handleInsufficientStock(e, router)) return;
    const msg = e instanceof Error ? e.message : String((e as { message?: unknown })?.message || '');
    error.value = msg || 'No se pudo iniciar el pago con MercadoPago.';
  } finally {
    loading.value = false;
    suppressEmptyRedirect.value = false;
  }
}
</script>

<style scoped>
.checkout { display: flex; flex-direction: column; gap: 12px; }
.muted { color: #666; }
.empty { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.content { display: flex; flex-direction: column; gap: 16px; }
.steps { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.step { padding: 6px 10px; border-radius: 14px; background: #f1f2f5; color: #666; font-weight: 600; font-size: 12px; }
.step.active { background: #e3f2ff; color: #1976d2; }
.steps .sep { flex: 1; height: 1px; background: #eee; }
.review .list { display: flex; flex-direction: column; gap: 6px; }
.row { display: flex; justify-content: space-between; }
.name { font-weight: 500; }
.price { font-weight: 600; }
.total { display: flex; justify-content: space-between; border-top: 1px dashed #ddd; padding-top: 8px; margin-top: 8px; }
.actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.actions.stack { flex-direction: column; align-items: flex-start; }
/* Make primary actions full-width, double-height */
.big-button {
  padding: 12px 16px;
  min-height: 80px;
  width: 100%;
}
.mp-button { 
  display: inline-flex; 
  align-items: stretch; 
  justify-content: center;
  padding: 12px 16px; 
  min-height: 80px; /* roughly double the default button height */
  background-color: #009ee3 !important; /* Mercado Pago blue */
  border-color: #009ee3 !important; 
  color: #fff !important;
}
.mp-button:focus,
.mp-button:focus-visible,
.mp-button:focus-within {
  outline: none !important;
  box-shadow: none !important; /* remove green focus ring */
}
.mp-button :deep(.n-button__border) {
  border-color: #009ee3 !important; /* ensure border stays brand blue */
}
.mp-button :deep(.n-button__state-border) {
  display: none !important; /* hide Naive UI state border that can appear green */
}
.mp-button:hover { 
  background-color: #0089c9 !important; 
  border-color: #0089c9 !important; 
}
.mp-button:active { 
  background-color: #007bb4 !important; 
  border-color: #007bb4 !important; 
}
/* Two-line content inside the button */
.mp-btn { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  gap: 6px; 
  width: 100%;
}
.mp-logo { 
  width: 100%;
  max-height: 44px; /* keep logo readable without making the button too tall */
  object-fit: contain; 
  display: block; 
}
.mp-label { 
  font-weight: 700; 
  font-size: 14px; 
  line-height: 1.1; 
}
.error { margin-top: 8px; color: #b71c1c; }
</style>

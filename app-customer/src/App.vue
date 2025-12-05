<template>
  <n-message-provider>
    <n-config-provider>
      <n-layout class="layout">
        <n-layout-header
          bordered
          class="header"
        >
          <div class="brand">
            <span class="logo">🍽️</span>
            <span>Buffet</span>
          </div>
          <div class="header-actions">
            <!-- Refresh menu: placed to the LEFT of the cart -->
            <n-button
              class="refresh"
              size="small"
              tertiary
              aria-label="Actualizar menú"
              @click="refreshMenu"
            >
              <template #icon>
                <n-icon><RefreshOutline /></n-icon>
              </template>
              <span class="hide-on-mobile">Actualizar</span>
            </n-button>

            <div
              class="cart"
              role="button"
              tabindex="0"
              :aria-label="cartQty > 0 ? `Abrir carrito. ${cartQty} items, subtotal ${currency(subtotal)}` : 'Abrir carrito, vacío'"
              @click="toggleCart"
              @keydown.enter="toggleCart"
              @keydown.space.prevent="toggleCart"
            >
              <n-badge
                :value="cartQty"
                :max="99"
                type="success"
              >
                <n-button
                  type="primary"
                  size="small"
                >
                  <template #icon>
                    <n-icon><CartOutline /></n-icon>
                  </template>
                  <span class="hide-on-mobile">Carrito</span>
                </n-button>
              </n-badge>
              <span
                v-if="cartQty > 0"
                class="subtotal"
              >{{ currency(subtotal) }}</span>
            </div>
          </div>
        </n-layout-header>

        <!-- Soft-offline banner overlay (suppressed on Success page so users can view their completed order) -->
        <div
          v-if="showSoftOverlay"
          class="soft-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div class="soft-card">
            <h3>Estamos en pausa momentánea</h3>
            <p>{{ platform.message.value || 'Volvemos en unos minutos.' }}</p>
            <small
              v-if="platform.offlineUntil.value"
              class="muted"
            >Hasta: {{ new Date(platform.offlineUntil.value).toLocaleString() }}</small>
          </div>
        </div>

        <!-- Hard-offline FULL SCREEN component -->
        <div
          v-if="platform.status.value === 'hard-offline'"
          class="hard-offline"
          role="dialog"
          aria-modal="true"
          aria-label="Servicio no disponible"
        >
          <div class="hard-card">
            <h1>Servicio no disponible</h1>
            <p class="desc">
              {{ platform.message.value || 'El buffet está temporalmente fuera de servicio. Intenta nuevamente más tarde.' }}
            </p>
            <small
              v-if="platform.offlineUntil.value"
              class="muted"
            >Hasta: {{ new Date(platform.offlineUntil.value).toLocaleString() }}</small>
            <div class="actions">
              <n-button
                type="primary"
                @click="retryNow"
              >
                Reintentar ahora
              </n-button>
            </div>
          </div>
        </div>

        <!-- Generic API error banner (technical difficulties) shown when an API request fails
             and we're not in hard/soft offline maintenance modes. -->
        <div
          v-if="showApiErrorBanner"
          class="api-error-banner"
          role="alert"
          aria-live="polite"
        >
          <div class="api-error__content">
            <div class="api-error__text">
              <strong>Estamos teniendo dificultades técnicas</strong>
              <span>Algunos pedidos o el menú podrían no cargarse correctamente.</span>
            </div>
            <div class="api-error__actions">
              <n-button
                size="small"
                type="primary"
                @click="retryNow"
              >
                Reintentar
              </n-button>
            </div>
          </div>
        </div>

        <n-layout-content class="main">
          <RouterView />
        </n-layout-content>

        <!-- Cart drawer -->
        <n-drawer
          v-model:show="drawer"
          placement="right"
          :width="320"
        >
          <n-drawer-content title="Tu pedido">
            <div
              v-if="items.length === 0"
              class="muted"
            >
              El carrito está vacío.
            </div>
            <div
              v-else
              class="cart-list"
            >
              <!-- Persistent shortage banner -->
              <div
                v-if="activeShortages.length"
                class="shortage-banner"
                role="alert"
                aria-live="polite"
              >
                <strong>No hay stock suficiente en algunos items.</strong>
                <ul>
                  <li
                    v-for="s in activeShortages"
                    :key="s.id"
                  >
                    {{ s.name || s.id }}: disponible {{ s.available }} (tenés {{ s.requested }})
                  </li>
                </ul>
                <div class="shortage-actions">
                  <n-button
                    size="small"
                    type="primary"
                    :disabled="activeShortageIds.size>0"
                    :title="activeShortageIds.size>0 ? 'Corregí las cantidades para continuar' : 'Ir a pagar'"
                    @click="goCheckout"
                  >
                    Intentar de nuevo
                  </n-button>
                  <n-button
                    size="small"
                    tertiary
                    @click="clearShortages"
                  >
                    Ocultar avisos
                  </n-button>
                </div>
              </div>

              <div
                v-for="it in items"
                :key="it.id"
                class="cart-row"
                :class="{ highlight: activeShortageIds.has(it.id) }"
              >
                <div class="info">
                  <strong>{{ it.name }}</strong>
                  <small class="muted">{{ currency(it.unitPrice) }} c/u</small>
                  <div
                    v-if="activeShortageIds.has(it.id)"
                    class="inline-hint"
                  >
                    <n-tag
                      size="small"
                      type="warning"
                      bordered
                    >
                      Disponible: x{{ availableFor(it.id) }}
                    </n-tag>
                  </div>
                </div>
                <div class="qty">
                  <n-button
                    size="small"
                    tertiary
                    @click="dec(it.id)"
                  >
                    -
                  </n-button>
                  <span class="q">{{ it.qty }}</span>
                  <n-button
                    size="small"
                    tertiary
                    @click="inc(it.id)"
                  >
                    +
                  </n-button>
                </div>
                <div class="row-total">
                  {{ currency(it.unitPrice * it.qty) }}
                </div>
              </div>
              <n-divider />
              <div class="totals">
                <div>Subtotal</div>
                <div>{{ currency(subtotal) }}</div>
              </div>
              <n-button
                type="primary"
                :disabled="items.length===0 || platform.status.value==='soft-offline' || activeShortageIds.size>0"
                :title="activeShortageIds.size>0 ? 'Corregí las cantidades antes de continuar' : ''"
                @click="goCheckout"
              >
                Continuar al pago
              </n-button>
            </div>
          </n-drawer-content>
        </n-drawer>
      </n-layout>
    </n-config-provider>
  </n-message-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { CartOutline, RefreshOutline } from '@vicons/ionicons5';
import { cart } from './lib/cart';
import { platform } from './lib/platform';
import { createDiscreteApi } from 'naive-ui';
import { apiOnline } from './lib/api';

const router = useRouter();
const drawer = ref(false);
// Use Naive UI discrete API so we don't depend on an outer provider in this component
const { message } = createDiscreteApi(['message']);

const items = computed(() => cart.items.value);
const subtotal = computed(() => cart.subtotal.value);
const cartQty = computed(() => cart.totalQty.value);

// Soft-offline should NOT block the Success page (order already created)
const isSuccessRoute = computed(() => {
  const path = router.currentRoute.value.path || '';
  // Match /success and /success/:id
  return path === '/success' || path.startsWith('/success/');
});
const showSoftOverlay = computed(() => platform.status.value === 'soft-offline' && !isSuccessRoute.value);

// Show technical difficulties banner when latest API call reported 5xx/network failure,
// but we are not in maintenance modes.
const showApiErrorBanner = computed(() => {
  if (platform.status.value === 'hard-offline') return false;
  // On soft-offline, we still may want to inform about transient errors, but the overlay already explains the pause.
  if (platform.status.value === 'soft-offline') return false;
  return apiOnline.value === false;
});

// Shortages state provided by Checkout on error; we keep available amounts here
type ShortageInfo = { id: string; name?: string; available: number };
const shortages = ref<Record<string, ShortageInfo>>({});

// Compute which IDs are currently over the available amount based on cart contents
const activeShortageIds = computed(() => {
  const set = new Set<string>();
  const map = shortages.value || {};
  for (const it of cart.items.value) {
    const s = map[it.id];
    if (s && it.qty > Math.max(0, Number(s.available || 0))) set.add(it.id);
  }
  return set;
});

// List used by the banner: include requested for each active shortage
const activeShortages = computed(() => {
  const res: Array<{ id: string; name?: string; available: number; requested: number }> = [];
  for (const id of activeShortageIds.value) {
    const s = shortages.value[id];
    const it = cart.items.value.find(i => i.id === id);
    if (s && it) res.push({ id, name: s.name, available: s.available, requested: it.qty });
  }
  return res;
});

function availableFor(id: string): number {
  const s = shortages.value[id];
  return Math.max(0, Number(s?.available ?? 0));
}

function clearShortages() {
  shortages.value = {};
}

// Monetary values are already expressed in ARS units (not cents)
function currency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

function toggleCart() {
  // Do not open the drawer if the cart is empty; it blocks the UI unnecessarily
  if (items.value.length === 0) {
    message.info('El carrito está vacío');
    drawer.value = false;
    return;
  }
  drawer.value = !drawer.value;
}
function refreshMenu() {
  // Notify the Menu page to refetch its data
  window.dispatchEvent(new CustomEvent('refresh-menu'));
}
function goCheckout() {
  // Clear shortage warnings when proceeding to checkout (they're already fixed)
  if (activeShortageIds.value.size === 0 && Object.keys(shortages.value || {}).length) {
    shortages.value = {};
  }
  drawer.value = false;
  router.push('/checkout');
}

function inc(id: string) { cart.increase(id); }
function dec(id: string) { cart.decrease(id); }

onMounted(() => {
  // Single initial fetch; ongoing checks are done just-in-time before API calls
  platform.fetch();
  // Start lightweight polling so status stays fresh even when idle
  const poll = () => platform.fetch();
  const interval = window.setInterval(poll, 20000);
  const openCartHandler = () => {
    // Only open if there are items to show; otherwise just inform the user
    if (items.value.length === 0) {
      message.info('El carrito está vacío');
      drawer.value = false;
    } else {
      drawer.value = true;
    }
  };
  type NotifyDetail = { type?: 'success' | 'warning' | 'error' | 'info'; message?: string; description?: string };
  const notifyHandler = (e: Event) => {
    const detail = ((e as CustomEvent).detail || {}) as NotifyDetail;
    const text = [detail.message, detail.description].filter(Boolean).join(' ');
    switch (detail.type) {
      case 'success': message.success(text); break;
      case 'warning': message.warning(text); break;
      case 'error': message.error(text); break;
      default: message.info(text || '');
    }
  };
  type ShortageDetail = { shortages?: Array<{ id: string; name?: string; available?: number }> };
  const setShortagesHandler = (e: Event) => {
    const detail = ((e as CustomEvent).detail || {}) as ShortageDetail;
    const list = Array.isArray(detail.shortages) ? detail.shortages : [];
    const map: Record<string, ShortageInfo> = {};
    for (const s of list) {
      const id = String(s.id);
      map[id] = { id, name: s.name, available: Math.max(0, Number(s.available ?? 0)) };
    }
    shortages.value = map;
  };
  // @ts-expect-error - custom global events
  window.addEventListener('open-cart', openCartHandler);
  // @ts-expect-error - custom global events
  window.addEventListener('notify', notifyHandler);
  // @ts-expect-error - custom global events
  window.addEventListener('set-shortages', setShortagesHandler);
  // Save to cleanup
  // @ts-expect-error store on window for teardown
  window.__openCartHandler = openCartHandler;
  // @ts-expect-error store on window for teardown
  window.__notifyHandler = notifyHandler;
  // @ts-expect-error store on window for teardown
  window.__setShortagesHandler = setShortagesHandler;
  // @ts-expect-error store interval for teardown
  window.__platformPoller = interval;
});

onBeforeUnmount(() => {
  // @ts-expect-error - custom global events
  if (window.__openCartHandler) window.removeEventListener('open-cart', window.__openCartHandler);
  // @ts-expect-error - custom global events
  if (window.__notifyHandler) window.removeEventListener('notify', window.__notifyHandler);
  // @ts-expect-error - custom global events
  if (window.__setShortagesHandler) window.removeEventListener('set-shortages', window.__setShortagesHandler);
  // @ts-expect-error - clear polling interval
  if (window.__platformPoller) clearInterval(window.__platformPoller);
});

// When user fixes all shortages, give a friendly hint that they can continue
watch(activeShortageIds, (set) => {
  if (set.size === 0 && Object.keys(shortages.value || {}).length) {
    message.success('Listo, ya podés continuar al pago.');
  }
});

function retryNow() {
  // Re-check platform status and notify pages to refresh their data
  platform.fetch();
  window.dispatchEvent(new CustomEvent('refresh-menu'));
}

// If the cart becomes empty while the drawer is open, close it to avoid blocking the UI
watch(
  () => items.value.length,
  (len, prev) => {
    if (len === 0 && drawer.value) {
      drawer.value = false;
      // Only notify if it changed from a non-empty state
      if ((prev || 0) > 0) message.info('El carrito quedó vacío');
    }
  }
);
</script>

<style scoped>
.layout { min-height: 100vh; background: #fafafa; }
.header {
  /* Use fixed to guarantee persistence even if a sibling becomes the scroll container */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 15;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

/* API technical difficulties banner */
.api-error-banner {
  position: sticky;
  top: 48px; /* below fixed header height */
  z-index: 14;
  background: #fff8e1;
  border-bottom: 1px solid #ffe082;
}
.api-error__content {
  max-width: 960px;
  margin: 0 auto;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.api-error__text { color: #7a5d00; display: flex; flex-direction: column; gap: 2px; }
.api-error__text strong { color: #6d4c00; }
.api-error__actions { flex: 0 0 auto; }
.brand { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.logo { font-size: 18px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.refresh { margin-right: 4px; }
.cart {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-radius: 8px;
  padding: 2px;
}
.cart:focus-visible {
  outline: 2px solid #18a058; /* Naive UI primary color default */
  outline-offset: 2px;
}
.subtotal { font-weight: 600; }
.main {
  /* Add top padding to avoid content being hidden under the fixed header */
  padding: 68px 12px 12px;
}
.hide-on-mobile { display: none; }
@media (min-width: 640px) { .hide-on-mobile { display: inline; } }

.muted { color: #666; }
.cart-list { display: flex; flex-direction: column; gap: 10px; }
/* Cart rows: ensure name wraps naturally and controls/prices don't wrap */
.cart-row {
  display: grid;
  /* Allow the name column to grow and shrink properly without forcing weird word splits */
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
}
.cart-row.highlight { background: #fff6e6; border-left: 4px solid #f0ad4e; transition: background 0.3s ease; }
.inline-hint { margin-top: 4px; }
.cart-row .info {
  display: flex;
  flex-direction: column;
  /* Let the grid item shrink so long words can wrap instead of pushing columns */
  min-width: 0;
  /* Prefer natural word boundaries; only break long tokens if needed */
  word-break: normal;
  /* Allow wrapping at word boundaries and break overly long tokens only as a last resort */
  overflow-wrap: break-word;
  /* Avoid auto-hyphenation to prevent mid-word splits like "Hamburguesa" */
  hyphens: none;
  -webkit-hyphens: none;
  -ms-hyphens: none;
}
.cart-row .info * {
  min-width: 0;
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
  hyphens: none;
  -webkit-hyphens: none;
  -ms-hyphens: none;
}
.cart-row .qty { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.cart-row .q { min-width: 20px; text-align: center; }
.row-total { font-weight: 600; white-space: nowrap; }
.totals { display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px; }

.shortage-banner { background: #fff3cd; color: #4a3c06; border: 1px solid #ffeeba; border-radius: 6px; padding: 8px; }
.shortage-banner ul { margin: 6px 0; padding-left: 18px; }
.shortage-actions { display: flex; justify-content: flex-end; }

.soft-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 20; }
.soft-card { background: #111; color: #fff; padding: 16px; border-radius: 10px; text-align: center; max-width: 480px; margin: 0 12px; }

/* Hard-offline full-screen */
.hard-offline { position: fixed; inset: 0; background: #111; color: #fff; z-index: 30; display: flex; align-items: center; justify-content: center; padding: 24px; }
.hard-card { max-width: 640px; text-align: center; }
.hard-card h1 { font-size: 28px; margin: 0 0 12px; }
.hard-card .desc { opacity: .92; line-height: 1.4; }
.hard-card .actions { margin-top: 16px; }

/* Small screens with high pixel density: slightly enlarge text and buttons for readability */
@media (max-width: 500px) and (min-resolution: 2dppx),
       (max-width: 500px) and (-webkit-min-device-pixel-ratio: 2) {
  .layout { font-size: 110%; }
  :deep(.n-button) { font-size: 1.05em; }
  :deep(.n-button.n-button--size-small) { font-size: 1.05em; }
  /* Make icons a touch larger for readability/tap targets on high-DPI small screens */
  :deep(.n-icon),
  :deep(.n-base-icon) {
    font-size: 1.15em;
  }
  /* But avoid making header cart icons too large, which can squeeze the name column */
  .cart :deep(.n-icon),
  .cart :deep(.n-base-icon) {
    font-size: 1em;
  }
}
</style>

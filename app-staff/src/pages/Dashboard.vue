<template>
  <!-- Tarjetas estáticas removidas: "Hoy", "Órdenes" (estáticas), "Usuarios activos" y "Actividad reciente" -->
  
  <!-- Feedback de clientes: visible para todos los roles logueados -->
  <n-card
    class="mt"
    :bordered="true"
  >
    <template #header>
      <div class="tile-header">
        <n-icon><ListOutline /></n-icon>
        <span>Satisfacción de clientes</span>
        <span class="spacer" />
        <n-button
          size="tiny"
          quaternary
          @click="toggleFeedback()"
        >
          {{ collapsedFeedback ? 'Expandir' : 'Minimizar' }}
        </n-button>
      </div>
    </template>
    <div
      v-if="!loadingFeedback"
      v-show="!collapsedFeedback"
      class="feedback-grid"
    >
      <div class="feedback-averages">
        <div class="avg-block">
          <div class="avg-title">
            General
          </div>
          <div class="avg-value">
            {{ fmtAvg(summary?.overallAvg) }}
          </div>
          <div class="avg-sub">
            Promedio total
          </div>
          <div class="count-highlight">
            {{ summary?.count || 0 }} respuestas
          </div>
        </div>
        <div class="avg-cats">
          <div class="avg-cat">
            <div class="avg-title">
              Facilidad
            </div>
            <div class="avg-value small">
              {{ fmtAvg(summary?.perCategory?.ease) }}
            </div>
          </div>
          <div class="avg-cat">
            <div class="avg-title">
              Velocidad
            </div>
            <div class="avg-value small">
              {{ fmtAvg(summary?.perCategory?.speed) }}
            </div>
          </div>
          <div class="avg-cat">
            <div class="avg-title">
              Calidad
            </div>
            <div class="avg-value small">
              {{ fmtAvg(summary?.perCategory?.quality) }}
            </div>
          </div>
        </div>
      </div>
      <div class="feedback-neg">
        <div class="panel-header">
          <strong>Últimas malas experiencias</strong>
          <n-tag
            size="small"
            type="error"
          >
            {{ badCount }}
          </n-tag>
        </div>
        <div
          v-if="(summary?.latestBad?.length || 0) > 0"
          class="bad-list"
        >
          <div
            v-for="rec in summary!.latestBad"
            :key="rec.orderId"
            class="bad-item"
          >
            <div class="bad-top">
              <span class="code">#{{ rec.shortCode }}</span>
              <span class="rating">{{ rec.avg.toFixed(1) }} / 5</span>
              <span class="when">{{ formatWhen(rec.createdAt) }}</span>
            </div>
            <div
              v-if="rec.comment"
              class="bad-text"
            >
              {{ rec.comment }}
            </div>
            <div
              v-else
              class="bad-text muted"
            >
              Sin comentario
            </div>
          </div>
        </div>
        <div
          v-else
          class="empty"
        >
          No hay comentarios negativos recientes.
        </div>
      </div>
    </div>
    <div
      v-else
      v-show="!collapsedFeedback"
      class="muted"
    >
      Cargando satisfacción…
    </div>
  </n-card>
  
  <!-- Stock alerts: out of stock and low stock -->
  <!-- Visible only to ADMIN and STOCK roles -->
  <n-card
    v-if="canSeeStockAlerts"
    class="mt"
    :bordered="true"
  >
    <template #header>
      <div class="tile-header">
        <n-icon><ListOutline /></n-icon>
        <span>Alertas de stock</span>
        <span class="spacer" />
        <n-button
          size="tiny"
          quaternary
          @click="toggleStock()"
        >
          {{ collapsedStock ? 'Expandir' : 'Minimizar' }}
        </n-button>
      </div>
    </template>
    <div
      v-show="!collapsedStock"
      class="stock-toolbar"
    >
      <div class="muted">
        Monitoreo de platos con stock agotado o cercano al umbral.
        <span class="toggle">
          <n-switch
            v-model:value="includeDonation"
            size="small"
          />
          <span class="toggle-label">Incluir Feria del Plato</span>
        </span>
      </div>
      <div class="actions">
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button
              size="small"
              tertiary
              circle
              :loading="loadingStock"
              @click="refreshStock"
            >
              <n-icon><RefreshOutline /></n-icon>
            </n-button>
          </template>
          Refrescar
        </n-tooltip>
        <n-button
          size="small"
          type="primary"
          @click="goToMenu"
        >
          Ir a Inventario
        </n-button>
      </div>
    </div>
    <div
      v-show="!collapsedStock"
      class="stock-grid"
    >
      <div class="stock-panel">
        <div class="panel-header">
          <strong>Agotados</strong>
          <n-tag
            type="error"
            size="small"
          >
            {{ outVisibleCount }}
          </n-tag>
        </div>
        <template v-if="outVisibleByCategory.length">
          <n-collapse
            v-model:expanded-names="outExpanded"
            :accordion="false"
          >
            <n-collapse-item
              v-for="grp in outVisibleByCategory"
              :key="grp.categoryId"
              :name="grp.categoryId"
              :title="`${grp.categoryName} (${grp.items.length})`"
            >
              <n-data-table
                :columns="outColsGrouped"
                :data="grp.items"
                :loading="loadingStock"
                :bordered="true"
                size="small"
                :pagination="{ pageSize: 5 }"
              />
            </n-collapse-item>
          </n-collapse>
        </template>
        <div
          v-else
          class="empty"
        >
          Sin items agotados.
        </div>
      </div>
      <div class="stock-panel">
        <div class="panel-header">
          <strong>Bajo stock</strong>
          <n-tag
            type="warning"
            size="small"
          >
            {{ lowVisibleCount }}
          </n-tag>
        </div>
        <template v-if="lowVisibleByCategory.length">
          <n-collapse
            v-model:expanded-names="lowExpanded"
            :accordion="false"
          >
            <n-collapse-item
              v-for="grp in lowVisibleByCategory"
              :key="grp.categoryId"
              :name="grp.categoryId"
              :title="`${grp.categoryName} (${grp.items.length})`"
            >
              <n-data-table
                :columns="lowColsGrouped"
                :data="grp.items"
                :loading="loadingStock"
                :bordered="true"
                size="small"
                :pagination="{ pageSize: 5 }"
              />
            </n-collapse-item>
          </n-collapse>
        </template>
        <div
          v-else
          class="empty"
        >
          Sin items con bajo stock.
        </div>
      </div>
    </div>
  </n-card>
  
  <!-- Orders overview: role-based sections -->
  <!-- CASHIER: shows orders waiting for payment -->
  <!-- FULFILLER: shows orders waiting fulfillment (paid but not fulfilled) -->
  <!-- ADMIN: sees both -->
  <n-card
    v-if="canSeeCashier || canSeeFulfillment"
    class="mt"
    :bordered="true"
  >
    <template #header>
      <div class="tile-header">
        <n-icon><ListOutline /></n-icon><span>Órdenes — Resumen</span><span class="spacer" /><n-button
          size="tiny"
          quaternary
          @click="toggleOrders()"
        >
          {{ collapsedOrders ? 'Expandir' : 'Minimizar' }}
        </n-button>
      </div>
    </template>
    <div
      v-show="!collapsedOrders"
      class="orders-sections"
    >
      <!-- Cashier section -->
      <div
        v-if="canSeeCashier"
        class="orders-panel"
      >
        <div class="panel-header">
          <strong>Esperando pago</strong>
          <span class="spacer" />
          <n-tag
            size="small"
            type="info"
            style="margin-right:8px"
          >
            Mostrando órdenes de los últimos 15 minutos
          </n-tag>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                size="small"
                tertiary
                circle
                :loading="loadingOrders"
                @click="refreshOrders"
              >
                <n-icon><RefreshOutline /></n-icon>
              </n-button>
            </template>
            Refrescar
          </n-tooltip>
          <n-button
            size="small"
            type="primary"
            @click="goToCashier"
          >
            Ir a Caja
          </n-button>
        </div>
        <div class="kpi">
          <div class="kpi-value">
            {{ pendingPaymentCount }}
          </div>
          <div class="kpi-sub">
            Ordenes con pago pendiente
          </div>
        </div>
      </div>

      <!-- Fulfillment section -->
      <div
        v-if="canSeeFulfillment"
        class="orders-panel"
      >
        <div class="panel-header">
          <strong>En preparación/entrega</strong>
          <span class="spacer" />
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                size="small"
                tertiary
                circle
                :loading="loadingOrders"
                @click="refreshOrders"
              >
                <n-icon><RefreshOutline /></n-icon>
              </n-button>
            </template>
            Refrescar
          </n-tooltip>
          <n-button
            size="small"
            type="primary"
            @click="goToFulfillment"
          >
            Ir a Entrega
          </n-button>
        </div>
        <div class="kpi">
          <div class="kpi-value">
            {{ awaitingFulfillmentCount }}
          </div>
          <div class="kpi-sub">
            Ordenes pagadas sin completar
          </div>
        </div>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted, watch } from 'vue';
import { NIcon, NTag, NButton, NTooltip, NCollapse, NCollapseItem, NSwitch, type DataTableColumns } from 'naive-ui';
import { ListOutline, RefreshOutline } from '@vicons/ionicons5';
import type { Item, Category, FeedbackSummary } from '../types';
import { staffApi, authApi, type StaffUser } from '../lib/api';
import { useRouter } from 'vue-router';

// Stock alerts logic
const router = useRouter();
const loadingStock = ref(false);
const items = ref<Item[]>([]);
const categories = ref<Category[]>([]);
const categoryMap = computed<Record<string, Category>>(() => Object.fromEntries(categories.value.map(c => [c.id, c])));
const currentUser = ref<StaffUser | null>(null);
const roles = computed(() => currentUser.value?.roles || []);
const canSeeStockAlerts = computed(() => roles.value.includes('ADMIN') || roles.value.includes('STOCK'));
const canSeeCashier = computed(() => roles.value.includes('ADMIN') || roles.value.includes('CASHIER'));
// Align with App.vue which uses role key 'ORDER_FULFILLER'
const canSeeFulfillment = computed(() => roles.value.includes('ADMIN') || roles.value.includes('ORDER_FULFILLER'));

// Collapsible sections state (persisted per device)
const LS_COLLAPSE_FB = 'staff-dash-collapsed-feedback';
const LS_COLLAPSE_ST = 'staff-dash-collapsed-stock';
const LS_COLLAPSE_ORD = 'staff-dash-collapsed-orders';
const collapsedFeedback = ref<boolean>(false);
const collapsedStock = ref<boolean>(false);
const collapsedOrders = ref<boolean>(false);
try {
  collapsedFeedback.value = localStorage.getItem(LS_COLLAPSE_FB) === '1';
  collapsedStock.value = localStorage.getItem(LS_COLLAPSE_ST) === '1';
  collapsedOrders.value = localStorage.getItem(LS_COLLAPSE_ORD) === '1';
} catch { void 0; }
function toggleFeedback() {
  collapsedFeedback.value = !collapsedFeedback.value;
  try { localStorage.setItem(LS_COLLAPSE_FB, collapsedFeedback.value ? '1' : '0'); } catch { void 0; }
}
function toggleStock() {
  collapsedStock.value = !collapsedStock.value;
  try { localStorage.setItem(LS_COLLAPSE_ST, collapsedStock.value ? '1' : '0'); } catch { void 0; }
}
function toggleOrders() {
  collapsedOrders.value = !collapsedOrders.value;
  try { localStorage.setItem(LS_COLLAPSE_ORD, collapsedOrders.value ? '1' : '0'); } catch { void 0; }
}

// Hide disabled items from stock alerts, regardless of their current stock
const outOfStock = computed(() =>
  items.value
    .filter(it => (it.active ?? true) && (it.stock ?? 0) <= 0)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
);
const lowStock = computed(() =>
  items.value
    .filter(it => {
      const isActive = it.active ?? true;
      const s = it.stock ?? 0;
      const t = it.lowStockThreshold ?? 0;
      return isActive && s > 0 && t > 0 && s <= t;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
);

async function loadStock() {
  loadingStock.value = true;
  try {
    items.value = await staffApi.getItems();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Error loading items', e);
  } finally {
    loadingStock.value = false;
  }
}

function refreshStock() { return loadStock(); }
function goToMenu() { router.push('/menu'); }
function goToCashier() { router.push('/cashier'); }
function goToFulfillment() { router.push('/fulfillment'); }

// Categories loading
async function loadCategories() {
  try {
    categories.value = await staffApi.getCategories();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Error loading categories', e);
    categories.value = [];
  }
}

// Grouping helpers
type Group = { categoryId: string; categoryName: string; items: Item[] };
const categoryOrder = computed<string[]>(() =>
  [...categories.value]
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.name.localeCompare(b.name))
    .map(c => c.id)
);

function groupByCategory(list: Item[]): Group[] {
  const groups: Record<string, Item[]> = {};
  for (const it of list) {
    const cid = it.categoryId || 'otros';
    (groups[cid] ||= []).push(it);
  }
  const ids = Object.keys(groups);
  const sortedIds = ids.sort((a, b) => {
    const ia = categoryOrder.value.indexOf(a);
    const ib = categoryOrder.value.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return sortedIds.map(id => {
    const cat = categoryMap.value[id];
    const name = cat?.name || id;
    const itemsSorted = groups[id].slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return { categoryId: id, categoryName: name, items: itemsSorted };
  });
}

// Toggle to include donation category/categories in stock alerts (disabled by default)
const DONATION_CATEGORY_IDS = new Set<string>(['feria-del-plat']);
const LS_TOGGLE_KEY = 'staff-dashboard-include-donation';
const includeDonation = ref<boolean>(false);
try {
  const saved = localStorage.getItem(LS_TOGGLE_KEY);
  if (saved === '1') includeDonation.value = true;
} catch { void 0; }

const outByCategory = computed<Group[]>(() => groupByCategory(outOfStock.value));
const lowByCategory = computed<Group[]>(() => groupByCategory(lowStock.value));

// Visible groups based on toggle
const outVisibleByCategory = computed<Group[]>(() =>
  outByCategory.value.filter(g => includeDonation.value || !DONATION_CATEGORY_IDS.has(g.categoryId))
);
const lowVisibleByCategory = computed<Group[]>(() =>
  lowByCategory.value.filter(g => includeDonation.value || !DONATION_CATEGORY_IDS.has(g.categoryId))
);

// Visible counts for header tags
const outVisibleCount = computed<number>(() => outVisibleByCategory.value.reduce((acc, g) => acc + g.items.length, 0));
const lowVisibleCount = computed<number>(() => lowVisibleByCategory.value.reduce((acc, g) => acc + g.items.length, 0));

const outExpanded = ref<string[]>([]);
const lowExpanded = ref<string[]>([]);

function setDefaultExpanded() {
  outExpanded.value = outVisibleByCategory.value.map(g => g.categoryId);
  lowExpanded.value = lowVisibleByCategory.value.map(g => g.categoryId);
}

// Persist toggle changes and adjust expanded groups to what's visible
watch(includeDonation, (val) => {
  try { localStorage.setItem(LS_TOGGLE_KEY, val ? '1' : '0'); } catch { void 0; }
  // Recalculate expanded to include/exclude donation categories according to visibility
  setDefaultExpanded();
});

// Orders overview logic
const loadingOrders = ref(false);
const pendingPaymentCount = ref<number>(0);
const awaitingFulfillmentCount = ref<number>(0);
// Time window for recent orders (in minutes)
const WINDOW_MINUTES = 15;
function isWithinWindow(createdAt?: string | number | Date): boolean {
  if (!createdAt) return false;
  const ts = typeof createdAt === 'number' ? createdAt : Date.parse(String(createdAt));
  if (!Number.isFinite(ts)) return false;
  const threshold = Date.now() - WINDOW_MINUTES * 60 * 1000;
  return ts >= threshold;
}
async function refreshOrders() {
  loadingOrders.value = true;
  try {
    // Fetch counts per state; keep lightweight
    const [pendingList, paidList] = await Promise.all([
      canSeeCashier.value ? staffApi.listOrders('pending_payment') : Promise.resolve([]),
      canSeeFulfillment.value ? staffApi.listOrders('paid') : Promise.resolve([]),
    ]);
    // Limit to last WINDOW_MINUTES minutes
    const recentPending = (pendingList || []).filter((o: any) => isWithinWindow(o?.createdAt));
    pendingPaymentCount.value = recentPending.length;
    // In case backend returns some fulfilled within 'paid', filter by fulfillment flag if present
    const awaiting = (paidList || []).filter((o: any) => !o.fulfillment);
    // For fulfillment we want ALL awaiting orders (no time window)
    awaitingFulfillmentCount.value = awaiting.length;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Error loading order counts', e);
    // Keep previous values on error
  } finally {
    loadingOrders.value = false;
  }
}

onMounted(async () => {
  try {
    const st = await authApi.status();
    currentUser.value = st.currentUser;
  } catch {
    currentUser.value = null;
  }
  // Load feedback summary for all roles
  await loadFeedback();
  // Only load stock data when the user is allowed to see this section
  if (canSeeStockAlerts.value) {
    await Promise.all([loadCategories(), loadStock()]);
    setDefaultExpanded();
  }
  // Load orders counts for visible sections
  if (canSeeCashier.value || canSeeFulfillment.value) {
    await refreshOrders();
  }
});

type Row = Item & { lowStockThreshold?: number };

// removed unused outCols/lowCols (grouped variants below are used)

// Grouped columns (category column removed, since grouping shows it in header)
const outColsGrouped: DataTableColumns<Row> = [
  { title: 'Plato', key: 'name' },
  { title: 'Stock', key: 'stock', width: 100, align: 'right', render: () => h(NTag, { type: 'error', size: 'small' }, { default: () => '0' }) },
  { title: 'Umbral', key: 'lowStockThreshold', width: 110, align: 'right' },
];

const lowColsGrouped: DataTableColumns<Row> = [
  { title: 'Plato', key: 'name' },
  { title: 'Stock', key: 'stock', width: 100, align: 'right', render: (row) => h(NTag, { type: 'warning', size: 'small' }, { default: () => String(row.stock ?? 0) }) },
  { title: 'Umbral', key: 'lowStockThreshold', width: 110, align: 'right' },
];

// --- Feedback summary ---
const loadingFeedback = ref(false);
const summary = ref<FeedbackSummary | null>(null);
const badCount = computed(() => summary.value?.latestBad?.length ?? 0);

async function loadFeedback() {
  loadingFeedback.value = true;
  try {
    const res = await staffApi.getFeedbackSummary();
    summary.value = res as FeedbackSummary;
  } catch {
    // keep silent
    summary.value = { count: 0, overallAvg: 0, perCategory: { ease: 0, speed: 0, quality: 0 }, latestBad: [] };
  } finally {
    loadingFeedback.value = false;
  }
}

function fmtAvg(n?: number) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '-';
  return n.toFixed(1);
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.tile-header { display:flex; align-items:center; gap:8px; font-weight:600; }
.kpi { display:flex; flex-direction:column; align-items:flex-start; gap:2px; }
.kpi-value { font-size: 28px; font-weight: 700; }
.kpi-sub { color: rgba(0,0,0,.45); }
.mt { margin-top: 12px; }

.stock-toolbar { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom: 8px; }
.stock-toolbar .actions { display:flex; align-items:center; gap:8px; }
.stock-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.panel-header { display:flex; align-items:center; gap:8px; margin-bottom: 8px; flex-wrap: wrap; }
.panel-header > strong { flex: 0 0 auto; }
/* Allow the info tag to wrap on small screens so it doesn't squeeze the first column */
.panel-header :deep(.n-tag) { white-space: normal; line-height: 1.1; }
/* When wrapping, push controls to the next line cleanly */
@media (max-width: 720px) {
  .panel-header { row-gap: 6px; }
  .panel-header .spacer { flex-basis: 100%; }
}
.empty { color: rgba(0,0,0,.45); font-size: 13px; padding: 8px 0; }
.muted { color: rgba(0,0,0,.45); font-size: 12px; display:flex; align-items:center; gap:8px; flex-wrap: wrap; }

/* Toggle alignment */
.toggle { display: inline-flex; align-items: center; gap: 6px; margin-left: 8px; }
.toggle-label { line-height: 1; }

/* Orders overview */
.orders-sections { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.orders-panel { display:flex; flex-direction:column; gap: 6px; }
.spacer { flex:1; }

/* Feedback */
.feedback-grid { display:grid; grid-template-columns: minmax(220px, 320px) 1fr; gap: 16px; }
.feedback-averages { display:flex; flex-direction: column; gap: 8px; }
.avg-block { display:flex; flex-direction:column; }
.avg-title { font-size: 12px; color: rgba(0,0,0,.55); }
.avg-value { font-size: 28px; font-weight: 700; }
.avg-value.small { font-size: 22px; }
.avg-sub { color: rgba(0,0,0,.45); font-size: 12px; }
.count-highlight { margin-top: 4px; font-size: 20px; font-weight: 800; color: #2b7a0b; }
.avg-cats { display:grid; grid-template-columns: repeat(3, minmax(80px, 1fr)); gap: 8px; }
.avg-cat { display:flex; flex-direction:column; gap: 2px; padding: 8px; border: 1px solid #eee; border-radius: 8px; }
.feedback-neg { display:flex; flex-direction:column; }
.bad-list { max-height: 280px; overflow: auto; display:flex; flex-direction: column; gap: 8px; }
.bad-item { border: 1px solid #eee; border-radius: 8px; padding: 8px; }
.bad-top { display:flex; gap: 8px; align-items:center; font-size: 12px; color: rgba(0,0,0,.55); }
.bad-top .code { font-weight: 600; color: rgba(0,0,0,.75); }
.bad-top .rating { margin-left: auto; font-weight: 600; color: #b71c1c; }
.bad-text { margin-top: 4px; white-space: pre-wrap; }
.bad-text.muted { color: rgba(0,0,0,.45); font-style: italic; }
@media (max-width: 720px) {
  .feedback-grid { grid-template-columns: 1fr; }
}
</style>

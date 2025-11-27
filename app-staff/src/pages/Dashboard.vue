<template>
  <!-- Tarjetas estáticas removidas: "Hoy", "Órdenes" (estáticas), "Usuarios activos" y "Actividad reciente" -->
  
  <!-- Stock alerts: out of stock and low stock -->
  <!-- Visible only to ADMIN and STOCK roles -->
  <n-card class="mt" :bordered="true" v-if="canSeeStockAlerts">
    <template #header>
      <div class="tile-header">
        <n-icon><ListOutline /></n-icon>
        <span>Alertas de stock</span>
      </div>
    </template>
    <div class="stock-toolbar">
      <div class="muted">
        Monitoreo de platos con stock agotado o cercano al umbral.
        <span class="toggle">
          <n-switch size="small" v-model:value="includeDonation" />
          <span class="toggle-label">Incluir Feria del Plato</span>
        </span>
      </div>
      <div class="actions">
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button size="small" tertiary circle :loading="loadingStock" @click="refreshStock">
              <n-icon><RefreshOutline /></n-icon>
            </n-button>
          </template>
          Refrescar
        </n-tooltip>
        <n-button size="small" type="primary" @click="goToMenu">
          Ir a Inventario
        </n-button>
      </div>
    </div>
    <div class="stock-grid">
      <div class="stock-panel">
        <div class="panel-header">
          <strong>Agotados</strong>
          <n-tag type="error" size="small">{{ outVisibleCount }}</n-tag>
        </div>
        <template v-if="outVisibleByCategory.length">
          <n-collapse v-model:expanded-names="outExpanded" :accordion="false">
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
        <div v-else class="empty">Sin items agotados.</div>
      </div>
      <div class="stock-panel">
        <div class="panel-header">
          <strong>Bajo stock</strong>
          <n-tag type="warning" size="small">{{ lowVisibleCount }}</n-tag>
        </div>
        <template v-if="lowVisibleByCategory.length">
          <n-collapse v-model:expanded-names="lowExpanded" :accordion="false">
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
        <div v-else class="empty">Sin items con bajo stock.</div>
      </div>
    </div>
  </n-card>
  
  <!-- Orders overview: role-based sections -->
  <!-- CASHIER: shows orders waiting for payment -->
  <!-- FULFILLER: shows orders waiting fulfillment (paid but not fulfilled) -->
  <!-- ADMIN: sees both -->
  <n-card class="mt" :bordered="true" v-if="canSeeCashier || canSeeFulfillment">
    <template #header>
      <div class="tile-header"><n-icon><ListOutline /></n-icon><span>Órdenes — Resumen</span></div>
    </template>
    <div class="orders-sections">
      <!-- Cashier section -->
      <div class="orders-panel" v-if="canSeeCashier">
        <div class="panel-header">
          <strong>Esperando pago</strong>
          <span class="spacer"></span>
          <n-tag size="small" type="info" style="margin-right:8px">Mostrando órdenes de los últimos 15 minutos</n-tag>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button size="small" tertiary circle :loading="loadingOrders" @click="refreshOrders">
                <n-icon><RefreshOutline /></n-icon>
              </n-button>
            </template>
            Refrescar
          </n-tooltip>
          <n-button size="small" type="primary" @click="goToCashier">Ir a Caja</n-button>
        </div>
        <div class="kpi">
          <div class="kpi-value">{{ pendingPaymentCount }}</div>
          <div class="kpi-sub">Ordenes con pago pendiente</div>
        </div>
      </div>

      <!-- Fulfillment section -->
      <div class="orders-panel" v-if="canSeeFulfillment">
        <div class="panel-header">
          <strong>En preparación/entrega</strong>
          <span class="spacer"></span>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button size="small" tertiary circle :loading="loadingOrders" @click="refreshOrders">
                <n-icon><RefreshOutline /></n-icon>
              </n-button>
            </template>
            Refrescar
          </n-tooltip>
          <n-button size="small" type="primary" @click="goToFulfillment">Ir a Entrega</n-button>
        </div>
        <div class="kpi">
          <div class="kpi-value">{{ awaitingFulfillmentCount }}</div>
          <div class="kpi-sub">Ordenes pagadas sin completar</div>
        </div>
      </div>
    </div>
  </n-card>
  
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted, watch } from 'vue';
import { NIcon, NTag, NButton, NTooltip, NCollapse, NCollapseItem, NSwitch, type DataTableColumns } from 'naive-ui';
import { ListOutline, RefreshOutline } from '@vicons/ionicons5';
import type { Item, Category } from '../types';
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
} catch {}

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
  try { localStorage.setItem(LS_TOGGLE_KEY, val ? '1' : '0'); } catch {}
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

const outCols: DataTableColumns<Row> = [
  { title: 'Plato', key: 'name' },
  { title: 'Categoría', key: 'categoryId', width: 140 },
  { title: 'Stock', key: 'stock', width: 100, align: 'right', render: () => h(NTag, { type: 'error', size: 'small' }, { default: () => '0' }) },
  { title: 'Umbral', key: 'lowStockThreshold', width: 110, align: 'right' },
];

const lowCols: DataTableColumns<Row> = [
  { title: 'Plato', key: 'name' },
  { title: 'Categoría', key: 'categoryId', width: 140 },
  { title: 'Stock', key: 'stock', width: 100, align: 'right', render: (row) => h(NTag, { type: 'warning', size: 'small' }, { default: () => String(row.stock ?? 0) }) },
  { title: 'Umbral', key: 'lowStockThreshold', width: 110, align: 'right' },
];

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
</style>

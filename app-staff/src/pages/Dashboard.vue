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
      <div class="muted">Monitoreo de platos con stock agotado o cercano al umbral.</div>
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
          <n-tag type="error" size="small">{{ outOfStock.length }}</n-tag>
        </div>
        <n-data-table
          :columns="outCols"
          :data="outOfStock"
          :loading="loadingStock"
          :bordered="true"
          size="small"
          :scroll-x="680"
          :pagination="{ pageSize: 5 }"
          v-if="outOfStock.length"
        />
        <div v-else class="empty">Sin items agotados.</div>
      </div>
      <div class="stock-panel">
        <div class="panel-header">
          <strong>Bajo stock</strong>
          <n-tag type="warning" size="small">{{ lowStock.length }}</n-tag>
        </div>
        <n-data-table
          :columns="lowCols"
          :data="lowStock"
          :loading="loadingStock"
          :bordered="true"
          size="small"
          :scroll-x="680"
          :pagination="{ pageSize: 5 }"
          v-if="lowStock.length"
        />
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
          <n-tag type="warning" size="small">{{ pendingPaymentCount }}</n-tag>
          <span class="spacer"></span>
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
          <n-tag type="info" size="small">{{ awaitingFulfillmentCount }}</n-tag>
          <span class="spacer"></span>
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button size="small" tertiary circle :loading="loadingOrders" @click="refreshOrders">
                <n-icon><RefreshOutline /></n-icon>
              </n-button>
            </template>
            Refrescar
          </n-tooltip>
          <n-button size="small" type="primary" @click="goToFulfillment">Ir a Preparación</n-button>
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
import { h, ref, computed, onMounted } from 'vue';
import { NIcon, NTag, NButton, NTooltip, type DataTableColumns } from 'naive-ui';
import { ListOutline, RefreshOutline } from '@vicons/ionicons5';
import type { Item } from '../types';
import { staffApi, authApi, type StaffUser } from '../lib/api';
import { useRouter } from 'vue-router';

// Stock alerts logic
const router = useRouter();
const loadingStock = ref(false);
const items = ref<Item[]>([]);
const currentUser = ref<StaffUser | null>(null);
const roles = computed(() => currentUser.value?.roles || []);
const canSeeStockAlerts = computed(() => roles.value.includes('ADMIN') || roles.value.includes('STOCK'));
const canSeeCashier = computed(() => roles.value.includes('ADMIN') || roles.value.includes('CASHIER'));
// Align with App.vue which uses role key 'ORDER_FULFILLER'
const canSeeFulfillment = computed(() => roles.value.includes('ADMIN') || roles.value.includes('ORDER_FULFILLER'));

const outOfStock = computed(() =>
  items.value.filter(it => (it.stock ?? 0) <= 0).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
);
const lowStock = computed(() =>
  items.value
    .filter(it => {
      const s = it.stock ?? 0;
      const t = it.lowStockThreshold ?? 0;
      return s > 0 && t > 0 && s <= t;
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

// Orders overview logic
const loadingOrders = ref(false);
const pendingPaymentCount = ref<number>(0);
const awaitingFulfillmentCount = ref<number>(0);
async function refreshOrders() {
  loadingOrders.value = true;
  try {
    // Fetch counts per state; keep lightweight
    const [pendingList, paidList] = await Promise.all([
      canSeeCashier.value ? staffApi.listOrders('pending_payment') : Promise.resolve([]),
      canSeeFulfillment.value ? staffApi.listOrders('paid') : Promise.resolve([]),
    ]);
    pendingPaymentCount.value = (pendingList || []).length;
    // In case backend returns some fulfilled within 'paid', filter by fulfillment flag if present
    const awaiting = (paidList || []).filter((o: any) => !o.fulfillment);
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
    await loadStock();
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
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.tile-header { display:flex; align-items:center; gap:8px; font-weight:600; }
.kpi { display:flex; flex-direction:column; align-items:flex-start; gap:2px; }
.kpi-value { font-size: 28px; font-weight: 700; }
.kpi-sub { color: rgba(0,0,0,.45); }
.mt { margin-top: 12px; }

.stock-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom: 8px; }
.stock-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.panel-header { display:flex; align-items:center; gap:8px; margin-bottom: 8px; }
.empty { color: rgba(0,0,0,.45); font-size: 13px; padding: 8px 0; }
.muted { color: rgba(0,0,0,.45); font-size: 12px; }

/* Orders overview */
.orders-sections { display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.orders-panel { display:flex; flex-direction:column; gap: 6px; }
.spacer { flex:1; }
</style>

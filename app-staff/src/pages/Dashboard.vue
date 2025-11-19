<template>
  <div class="grid">
    <n-card class="tile" :bordered="true">
      <template #header>
        <div class="tile-header"><n-icon><BarChartOutline /></n-icon><span>Hoy</span></div>
      </template>
      <div class="kpi">
        <div class="kpi-value">{{ currency( revenueToday ) }}</div>
        <div class="kpi-sub">Ingresos</div>
      </div>
    </n-card>
    <n-card class="tile" :bordered="true">
      <template #header>
        <div class="tile-header"><n-icon><ListOutline /></n-icon><span>Órdenes</span></div>
      </template>
      <div class="kpi">
        <div class="kpi-value">{{ ordersToday }}</div>
        <div class="kpi-sub">Procesadas</div>
      </div>
    </n-card>
    <n-card class="tile" :bordered="true">
      <template #header>
        <div class="tile-header"><n-icon><PersonOutline /></n-icon><span>Usuarios activos</span></div>
      </template>
      <div class="kpi">
        <div class="kpi-value">{{ activeUsers }}</div>
        <div class="kpi-sub">Staff conectado</div>
      </div>
    </n-card>
  </div>

  <n-card class="mt" :bordered="true">
    <template #header>
      <div class="tile-header"><n-icon><TrendingUpOutline /></n-icon><span>Actividad reciente</span></div>
    </template>
    <n-data-table :columns="columns" :data="recent" size="small" :bordered="false" />
  </n-card>
  
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
        <n-button size="small" tertiary @click="refreshStock" :loading="loadingStock">Refrescar</n-button>
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
  
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted } from 'vue';
import { NIcon, NTag, NButton, type DataTableColumns } from 'naive-ui';
import { BarChartOutline, ListOutline, PersonOutline, TrendingUpOutline } from '@vicons/ionicons5';
import type { Item } from '../types';
import { staffApi, authApi, type StaffUser } from '../lib/api';
import { useRouter } from 'vue-router';

const revenueToday = ref(235000);
const ordersToday = ref(57);
const activeUsers = ref(6);
const recent = ref([
  { time: '10:02', event: 'Orden #1245 aceptada', actor: 'Ana' },
  { time: '09:51', event: 'Ingrediente "Tomate" repuesto', actor: 'Juan' },
  { time: '09:33', event: 'Orden #1244 entregada', actor: 'Luis' },
]);

const columns: DataTableColumns<any> = [
  { title: 'Hora', key: 'time', width: 120 },
  { title: 'Evento', key: 'event' },
  { title: 'Usuario', key: 'actor', width: 160 }
];

const currency = (v: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);

// Stock alerts logic
const router = useRouter();
const loadingStock = ref(false);
const items = ref<Item[]>([]);
const currentUser = ref<StaffUser | null>(null);
const canSeeStockAlerts = computed(() => {
  const roles = currentUser.value?.roles || [];
  return roles.includes('ADMIN') || roles.includes('STOCK');
});

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
</style>

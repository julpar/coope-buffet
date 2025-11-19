<template>
  <div class="page">
    <div class="toolbar">
      <n-input v-model:value="q" placeholder="Buscar orden..." clearable class="grow">
        <template #prefix>
          <n-icon size="16"><SearchOutline /></n-icon>
        </template>
      </n-input>
      <n-select v-model:value="state" :options="stateOptions" placeholder="Estado" style="width:200px" />
      <n-button type="primary" tertiary :loading="loading" @click="refresh">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
        Actualizar
      </n-button>
    </div>

    <n-data-table :columns="columns" :data="filtered" :bordered="true" :loading="loading" />
  </div>
  
</template>

<script setup lang="ts">
import { h, computed, ref, onMounted, watch } from 'vue';
import { useMessage, NTag, NButton, NIcon, type DataTableColumns } from 'naive-ui';
import { RefreshOutline, SearchOutline, PlayForwardOutline, CloseOutline } from '@vicons/ionicons5';
import { staffApi } from '../lib/api';

type State = 'pending_payment' | 'paid' | 'fulfilled' | 'all';
type Fulfillment = 'received' | 'preparing' | 'ready' | 'completed' | undefined;
const q = ref('');
const state = ref<State>('paid');
const loading = ref(false);
const msg = useMessage();
type Row = { id: string; items: number; total: string; fulfillment: Fulfillment; raw: any };
const rows = ref<Row[]>([]);

const peso = (cents: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format((cents || 0) / 100);

const stateOptions = [
  { label: 'Todas', value: 'all' },
  { label: 'Esperando pago', value: 'pending_payment' },
  { label: 'Pagadas (en preparación)', value: 'paid' },
  { label: 'Completadas', value: 'fulfilled' },
];

const filtered = computed(() => rows.value.filter(r =>
  (!q.value || `${r.id}`.toLowerCase().includes(q.value.toLowerCase()))
));

const label = (s?: Fulfillment) => ({ received: 'Pago Pendiente', preparing: 'Preparando', ready: 'Lista', completed: 'Completada' } as any)[s || ''] || (s || '');
const tagType = (s?: Fulfillment) => ({ received: 'warning', preparing: 'info', ready: 'success', completed: 'default' } as any)[s || ''] || 'default';

const columns: DataTableColumns<Row> = [
  { title: '#', key: 'id', width: 160 },
  { title: 'Items', key: 'items', width: 80 },
  { title: 'Total', key: 'total', width: 120 },
  { title: 'Estado', key: 'fulfillment', width: 160, render: (row: Row) => h(NTag, { type: tagType(row.fulfillment) }, { default: () => label(row.fulfillment) }) },
  { title: 'Acciones', key: 'actions', width: 220, render: (row: Row) => h('div', { style: 'display:flex; gap:8px' }, [
      h(NButton, { size: 'small', tertiary: true, disabled: !canAdvance(row), onClick: () => advance(row) }, {
        icon: () => h(NIcon, null, { default: () => h(PlayForwardOutline) }),
        default: () => 'Avanzar'
      }),
      h(NButton, { size: 'small', quaternary: true, type: 'error', onClick: () => cancel(row) }, {
        icon: () => h(NIcon, null, { default: () => h(CloseOutline) }),
        default: () => 'Cancelar'
      })
    ])
  }
];

async function refresh() {
  loading.value = true;
  try {
    const list = await staffApi.listOrders(state.value);
    // Map to rows
    rows.value = (list || []).map((o: any) => ({
      id: o.id,
      items: Array.isArray(o.items) ? o.items.reduce((a: number, it: any) => a + (it.qty || 0), 0) : 0,
      total: peso(o.total || 0),
      fulfillment: o.fulfillment as Fulfillment,
      raw: o,
    }));
  } catch (err: any) {
    console.error(err);
    msg.error('No se pudieron cargar las órdenes');
  } finally {
    loading.value = false;
  }
}

function canAdvance(row: Row): boolean {
  // Only advance orders that are currently paid, regardless of selected filter
  const isPaid = row?.raw?.status === 'paid';
  const canProgress = row.fulfillment === 'received' || row.fulfillment === 'preparing' || row.fulfillment === 'ready';
  return !!isPaid && canProgress;
}

async function advance(row: Row) {
  if (!canAdvance(row)) return;
  const map: Record<string, Fulfillment> = { received: 'preparing', preparing: 'ready', ready: 'completed' };
  const next = map[row.fulfillment || 'received'];
  try {
    await staffApi.setOrderFulfillment(row.id, next as any);
    await refresh();
  } catch (err: any) {
    console.error(err);
    msg.error('No se pudo avanzar la orden');
  }
}

async function cancel(row: Row) {
  if (!window.confirm(`¿Cancelar la orden ${row.id}?`)) return;
  try {
    await staffApi.cancelOrder(row.id);
    await refresh();
  } catch (err: any) {
    console.error(err);
    msg.error('No se pudo cancelar la orden');
  }
}

onMounted(() => { refresh(); });

// Auto refresh when changing the state filter
watch(state, () => {
  refresh();
});
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; gap: 8px; align-items: center; }
.grow { flex: 1; }
</style>

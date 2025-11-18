<template>
  <div class="page">
    <div class="toolbar">
      <n-input v-model:value="q" placeholder="Buscar orden..." clearable class="grow">
        <template #prefix>
          <n-icon size="16"><SearchOutline /></n-icon>
        </template>
      </n-input>
      <n-select v-model:value="status" :options="statusOptions" placeholder="Estado" style="width:160px" />
      <n-button type="primary" tertiary @click="refresh">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
        Actualizar
      </n-button>
    </div>

    <n-data-table :columns="columns" :data="filtered" :bordered="true" />
  </div>
  
</template>

<script setup lang="ts">
import { h, computed, ref } from 'vue';
import { NTag, NButton, NIcon, type DataTableColumns } from 'naive-ui';
import { RefreshOutline, SearchOutline, PlayForwardOutline, CloseOutline } from '@vicons/ionicons5';

type Status = '' | 'pending' | 'preparing' | 'ready' | 'delivered'
const q = ref('');
const status = ref<Status>('');
const rows = ref([
  { id: 1245, customer: 'Camila', items: 3, total: '$8.500', status: 'pending' },
  { id: 1244, customer: 'Diego', items: 1, total: '$2.200', status: 'ready' },
  { id: 1243, customer: 'Lucía', items: 2, total: '$5.000', status: 'preparing' },
  { id: 1242, customer: 'Martin', items: 4, total: '$12.700', status: 'delivered' },
]);

const statusOptions = [
  { label: 'Todas', value: '' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Preparando', value: 'preparing' },
  { label: 'Lista', value: 'ready' },
  { label: 'Entregada', value: 'delivered' }
];

const filtered = computed(() => rows.value.filter(r =>
  (!status.value || r.status === status.value) &&
  (!q.value || `${r.id} ${r.customer}`.toLowerCase().includes(q.value.toLowerCase()))
));

const label = (s: string) => ({ pending: 'Pendiente', preparing: 'Preparando', ready: 'Lista', delivered: 'Entregada' } as any)[s] || s;
const tagType = (s: string) => ({ pending: 'warning', preparing: 'info', ready: 'success', delivered: 'default' } as any)[s] || 'default';

const columns: DataTableColumns<any> = [
  { title: '#', key: 'id', width: 90 },
  { title: 'Cliente', key: 'customer' },
  { title: 'Items', key: 'items' },
  { title: 'Total', key: 'total' },
  { title: 'Estado', key: 'status', width: 160, render: (row: any) => h(NTag, { type: tagType(row.status) }, { default: () => label(row.status) }) },
  { title: 'Acciones', key: 'actions', width: 200, render: (row: any) => h('div', { style: 'display:flex; gap:8px' }, [
      h(NButton, { size: 'small', tertiary: true, disabled: row.status==='delivered', onClick: () => advance(row) }, {
        icon: () => h(NIcon, null, { default: () => h(PlayForwardOutline) }),
        default: () => 'Avanzar'
      }),
      h(NButton, { size: 'small', quaternary: true, type: 'error' }, {
        icon: () => h(NIcon, null, { default: () => h(CloseOutline) }),
        default: () => 'Cancelar'
      })
    ])
  }
];

const refresh = () => {/* TODO: fetch */};
const advance = (row: any) => {
  const order = rows.value.find(r => r.id === row.id);
  if (!order) return;
  const step: Record<string, string> = { pending: 'preparing', preparing: 'ready', ready: 'delivered' };
  order.status = step[order.status] || order.status;
};
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; gap: 8px; align-items: center; }
.grow { flex: 1; }
</style>

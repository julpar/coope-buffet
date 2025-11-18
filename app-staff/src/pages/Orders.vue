<template>
  <div class="page">
    <div class="toolbar">
      <el-input v-model="q" placeholder="Buscar orden..." clearable prefix-icon="Search" class="grow" />
      <el-select v-model="status" placeholder="Estado" style="width:160px">
        <el-option label="Todas" value="" />
        <el-option label="Pendiente" value="pending" />
        <el-option label="Preparando" value="preparing" />
        <el-option label="Lista" value="ready" />
        <el-option label="Entregada" value="delivered" />
      </el-select>
      <el-button type="primary" :icon="Refresh" @click="refresh">Actualizar</el-button>
    </div>

    <el-table :data="filtered" border style="width: 100%">
      <el-table-column prop="id" label="#" width="90" />
      <el-table-column prop="customer" label="Cliente" />
      <el-table-column prop="items" label="Items" />
      <el-table-column prop="total" label="Total" />
      <el-table-column prop="status" label="Estado" width="140">
        <template #default="{ row }">
          <el-tag :type="tagType(row.status)">{{ label(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Acciones" width="180">
        <template #default="{ row }">
          <el-button size="small" @click="advance(row)" :disabled="row.status==='delivered'">Avanzar</el-button>
          <el-button size="small" type="danger" text>Cancelar</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';

type Status = '' | 'pending' | 'preparing' | 'ready' | 'delivered'
const q = ref('');
const status = ref<Status>('');
const rows = ref([
  { id: 1245, customer: 'Camila', items: 3, total: '$8.500', status: 'pending' },
  { id: 1244, customer: 'Diego', items: 1, total: '$2.200', status: 'ready' },
  { id: 1243, customer: 'Lucía', items: 2, total: '$5.000', status: 'preparing' },
  { id: 1242, customer: 'Martin', items: 4, total: '$12.700', status: 'delivered' },
]);

const filtered = computed(() => rows.value.filter(r =>
  (!status.value || r.status === status.value) &&
  (!q.value || `${r.id} ${r.customer}`.toLowerCase().includes(q.value.toLowerCase()))
));

const tagType = (s: string) => ({ pending: 'warning', preparing: 'info', ready: 'success', delivered: '' } as any)[s] || '';
const label = (s: string) => ({ pending: 'Pendiente', preparing: 'Preparando', ready: 'Lista', delivered: 'Entregada' } as any)[s] || s;

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

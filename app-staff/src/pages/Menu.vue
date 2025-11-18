<template>
  <div class="page">
    <div class="toolbar">
      <n-input v-model:value="q" placeholder="Buscar plato..." clearable class="grow">
        <template #prefix>
          <n-icon size="16"><SearchOutline /></n-icon>
        </template>
      </n-input>
      <n-button type="primary" tertiary @click="refresh" :loading="loading">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        Refrescar
      </n-button>
    </div>
    <n-data-table :columns="columns" :data="filtered" :loading="loading" :bordered="true" />
  </div>
</template>

<script setup lang="ts">
import { h, computed, ref, onMounted } from 'vue';
import { NTag, NButton, NIcon, useMessage, type DataTableColumns } from 'naive-ui';
import { AddOutline, CreateOutline, CopyOutline, SearchOutline, RefreshOutline } from '@vicons/ionicons5';
import type { Item } from '../types';
import { getStaffItems } from '../lib/api';

const q = ref('');
const loading = ref(false);
const items = ref<Item[]>([]);
const message = useMessage();

function availabilityOf(it: Item): 'in-stock' | 'limited' | 'sold-out' {
  const stock = it.stock ?? 0;
  const low = it.lowStockThreshold ?? 0;
  if (stock <= 0) return 'sold-out';
  if (low > 0 && stock <= low) return 'limited';
  return 'in-stock';
}

const rows = computed(() => items.value.map(it => ({
  ...it,
  priceFmt: currency(it.price),
  availability: it.availability || availabilityOf(it),
})));

const filtered = computed(() => rows.value.filter(r => !q.value || r.name.toLowerCase().includes(q.value.toLowerCase())));

const columns: DataTableColumns<any> = [
  { title: 'Plato', key: 'name' },
  { title: 'Precio', key: 'priceFmt', width: 140 },
  { title: 'Stock', key: 'stock', width: 100 },
  { title: 'Disponible', key: 'availability', width: 160, render: (row: any) => {
      const t = row.availability === 'sold-out' ? 'error' : row.availability === 'limited' ? 'warning' : 'success';
      const label = row.availability === 'sold-out' ? 'No' : row.availability === 'limited' ? 'Bajo' : 'Sí';
      return h(NTag, { type: t }, { default: () => label });
    }
  },
  { title: 'Acciones', key: 'actions', width: 220, render: (row: any) => h('div', { style: 'display:flex; gap:8px' }, [
      h(NButton, { quaternary: true, size: 'small' }, { default: () => 'Editar', icon: () => h('i', { class: 'n-icon' }, h(CreateOutline)) }),
      h(NButton, { quaternary: true, size: 'small' }, { default: () => 'Duplicar', icon: () => h('i', { class: 'n-icon' }, h(CopyOutline)) })
    ])
  }
];

async function refresh() {
  loading.value = true;
  try {
    items.value = await getStaffItems();
  } catch (err: any) {
    console.error(err);
    message.error('No se pudo cargar el menú desde el servidor');
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

function currency(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
}
</script>

<style scoped>
.page { display:flex; flex-direction:column; gap:12px; }
.toolbar { display:flex; gap:8px; align-items:center; }
.grow { flex:1; }
</style>

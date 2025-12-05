<template>
  <div class="page">
    <div class="toolbar">
      <n-input
        v-model:value="q"
        placeholder="Buscar ingrediente..."
        clearable
        class="grow"
      >
        <template #prefix>
          <n-icon size="16">
            <SearchOutline />
          </n-icon>
        </template>
      </n-input>
      <n-button
        type="primary"
        tertiary
      >
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        Nuevo
      </n-button>
    </div>
    <n-data-table
      :columns="columns"
      :data="filtered"
      :bordered="true"
    />
  </div>
</template>

<script setup lang="ts">
import { h, computed, ref } from 'vue';
import { NButton, NIcon, type DataTableColumns } from 'naive-ui';
import { AddOutline, CreateOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5';

const q = ref('');
const rows = ref([
  { name: 'Tomate', stock: 24, unit: 'kg' },
  { name: 'Queso', stock: 8, unit: 'kg' },
  { name: 'Pan', stock: 40, unit: 'u' },
]);
const filtered = computed(() => rows.value.filter(r =>
  !q.value || r.name.toLowerCase().includes(q.value.toLowerCase())
));

const columns: DataTableColumns<any> = [
  { title: 'Ingrediente', key: 'name' },
  { title: 'Stock', key: 'stock', width: 120 },
  { title: 'Unidad', key: 'unit', width: 120 },
  {
    title: 'Acciones', key: 'actions', width: 200, render: (row: any) => (
      h('div', { style: 'display:flex; gap:8px' }, [
        h(NButton, { quaternary: true, size: 'small' }, { default: () => 'Editar', icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) }),
        h(NButton, { quaternary: true, size: 'small', type: 'error' }, { default: () => 'Eliminar', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
      ])
    )
  }
];
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display:flex; gap:8px; align-items:center; }
.grow { flex: 1; }
</style>

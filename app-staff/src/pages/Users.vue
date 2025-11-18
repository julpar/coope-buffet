<template>
  <div class="page">
    <div class="toolbar">
      <n-input v-model:value="q" placeholder="Buscar usuario..." clearable class="grow">
        <template #prefix>
          <n-icon size="16"><SearchOutline /></n-icon>
        </template>
      </n-input>
      <n-button type="primary" tertiary>
        <template #icon><n-icon><PersonAddOutline /></n-icon></template>
        Invitar
      </n-button>
    </div>
    <n-data-table :columns="columns" :data="filtered" :bordered="true" />
  </div>
</template>

<script setup lang="ts">
import { h, computed, ref } from 'vue';
import { NTag, NButton, type DataTableColumns } from 'naive-ui';
import { PersonAddOutline, CreateOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5';

const q = ref('');
const rows = ref([
  { name: 'Ana', role: 'Cocina', status: 'activo' },
  { name: 'Luis', role: 'Caja', status: 'invitado' },
  { name: 'Sofía', role: 'Administrador', status: 'activo' },
]);
const filtered = computed(() => rows.value.filter(r => !q.value || r.name.toLowerCase().includes(q.value.toLowerCase())));

const columns: DataTableColumns<any> = [
  { title: 'Nombre', key: 'name' },
  { title: 'Rol', key: 'role', width: 160 },
  { title: 'Estado', key: 'status', width: 140, render: (row: any) => h(NTag, { type: row.status === 'activo' ? 'success' : 'warning' }, { default: () => row.status }) },
  { title: 'Acciones', key: 'actions', width: 200, render: (row: any) => h('div', { style: 'display:flex; gap:8px' }, [
      h(NButton, { quaternary: true, size: 'small' }, { default: () => 'Editar', icon: () => h('i', { class: 'n-icon' }, h(CreateOutline)) }),
      h(NButton, { quaternary: true, size: 'small', type: 'error' }, { default: () => 'Eliminar', icon: () => h('i', { class: 'n-icon' }, h(TrashOutline)) })
    ])
  }
];
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display:flex; align-items:center; gap:8px; }
.grow { flex: 1; }
</style>

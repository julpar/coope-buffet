<template>
  <div class="page">
    <div class="toolbar">
      <el-input v-model="q" placeholder="Buscar ingrediente..." clearable prefix-icon="Search" class="grow" />
      <el-button :icon="Plus" type="primary">Nuevo</el-button>
    </div>
    <el-table :data="filtered" stripe>
      <el-table-column prop="name" label="Ingrediente" />
      <el-table-column prop="stock" label="Stock" width="120" />
      <el-table-column prop="unit" label="Unidad" width="120" />
      <el-table-column label="Acciones" width="180">
        <template #default="{ row }">
          <el-button size="small" :icon="Edit" text>Editar</el-button>
          <el-button size="small" type="danger" :icon="Delete" text>Eliminar</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue';

const q = ref('');
const rows = ref([
  { name: 'Tomate', stock: 24, unit: 'kg' },
  { name: 'Queso', stock: 8, unit: 'kg' },
  { name: 'Pan', stock: 40, unit: 'u' },
]);
const filtered = computed(() => rows.value.filter(r =>
  !q.value || r.name.toLowerCase().includes(q.value.toLowerCase())
));
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display:flex; gap:8px; align-items:center; }
.grow { flex: 1; }
</style>

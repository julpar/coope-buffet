<template>
  <div class="page">
    <div class="toolbar">
      <el-input v-model="q" placeholder="Buscar plato..." clearable prefix-icon="Search" class="grow" />
      <el-button type="primary" :icon="Plus">Nuevo plato</el-button>
    </div>
    <el-table :data="filtered" stripe>
      <el-table-column prop="name" label="Plato" />
      <el-table-column prop="price" label="Precio" width="140" />
      <el-table-column prop="available" label="Disponible" width="140">
        <template #default="{ row }">
          <el-tag :type="row.available ? 'success' : 'danger'">{{ row.available ? 'Sí' : 'No' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Acciones" width="200">
        <template #default>
          <el-button size="small" :icon="Edit" text>Editar</el-button>
          <el-button size="small" :icon="CopyDocument" text>Duplicar</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Plus, Edit, CopyDocument, Search } from '@element-plus/icons-vue';

const q = ref('');
const rows = ref([
  { name: 'Milanesa con papas', price: '$5.500', available: true },
  { name: 'Ensalada César', price: '$4.200', available: true },
  { name: 'Sopa del día', price: '$3.100', available: false },
]);
const filtered = computed(() => rows.value.filter(r => !q.value || r.name.toLowerCase().includes(q.value.toLowerCase())));
</script>

<style scoped>
.page { display:flex; flex-direction:column; gap:12px; }
.toolbar { display:flex; gap:8px; align-items:center; }
.grow { flex:1; }
</style>

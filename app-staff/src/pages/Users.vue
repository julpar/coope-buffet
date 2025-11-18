<template>
  <div class="page">
    <div class="toolbar">
      <el-input v-model="q" placeholder="Buscar usuario..." clearable prefix-icon="Search" class="grow" />
      <el-button type="primary" :icon="Plus">Invitar</el-button>
    </div>
    <el-table :data="filtered" stripe>
      <el-table-column prop="name" label="Nombre" />
      <el-table-column prop="role" label="Rol" width="160" />
      <el-table-column prop="status" label="Estado" width="140">
        <template #default="{ row }">
          <el-tag :type="row.status==='activo' ? 'success' : 'warning'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Acciones" width="180">
        <template #default>
          <el-button size="small" text :icon="Edit">Editar</el-button>
          <el-button size="small" text type="danger" :icon="Delete">Eliminar</el-button>
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
  { name: 'Ana', role: 'Cocina', status: 'activo' },
  { name: 'Luis', role: 'Caja', status: 'invitado' },
  { name: 'Sofía', role: 'Administrador', status: 'activo' },
]);
const filtered = computed(() => rows.value.filter(r => !q.value || r.name.toLowerCase().includes(q.value.toLowerCase())));
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display:flex; align-items:center; gap:8px; }
.grow { flex: 1; }
</style>

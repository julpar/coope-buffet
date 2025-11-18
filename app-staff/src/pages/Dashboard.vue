<template>
  <div class="grid">
    <el-card shadow="hover" class="tile">
      <template #header>
        <div class="tile-header"><el-icon><DataAnalysis/></el-icon><span>Hoy</span></div>
      </template>
      <div class="kpi">
        <div class="kpi-value">{{ currency( revenueToday ) }}</div>
        <div class="kpi-sub">Ingresos</div>
      </div>
    </el-card>
    <el-card shadow="hover" class="tile">
      <template #header>
        <div class="tile-header"><el-icon><List/></el-icon><span>Órdenes</span></div>
      </template>
      <div class="kpi">
        <div class="kpi-value">{{ ordersToday }}</div>
        <div class="kpi-sub">Procesadas</div>
      </div>
    </el-card>
    <el-card shadow="hover" class="tile">
      <template #header>
        <div class="tile-header"><el-icon><User/></el-icon><span>Usuarios activos</span></div>
      </template>
      <div class="kpi">
        <div class="kpi-value">{{ activeUsers }}</div>
        <div class="kpi-sub">Staff conectado</div>
      </div>
    </el-card>
  </div>

  <el-card class="mt">
    <template #header>
      <div class="tile-header"><el-icon><TrendCharts/></el-icon><span>Actividad reciente</span></div>
    </template>
    <el-table :data="recent" size="small" stripe>
      <el-table-column prop="time" label="Hora" width="120" />
      <el-table-column prop="event" label="Evento" />
      <el-table-column prop="actor" label="Usuario" width="160" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DataAnalysis, List, User, TrendCharts } from '@element-plus/icons-vue';

const revenueToday = ref(235000);
const ordersToday = ref(57);
const activeUsers = ref(6);
const recent = ref([
  { time: '10:02', event: 'Orden #1245 aceptada', actor: 'Ana' },
  { time: '09:51', event: 'Ingrediente "Tomate" repuesto', actor: 'Juan' },
  { time: '09:33', event: 'Orden #1244 entregada', actor: 'Luis' },
]);

const currency = (v: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.tile-header { display:flex; align-items:center; gap:8px; font-weight:600; }
.kpi { display:flex; flex-direction:column; align-items:flex-start; gap:2px; }
.kpi-value { font-size: 28px; font-weight: 700; }
.kpi-sub { color: var(--el-text-color-secondary); }
.mt { margin-top: 12px; }
</style>

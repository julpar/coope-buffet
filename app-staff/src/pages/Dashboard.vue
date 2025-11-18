<template>
  <div class="grid">
    <n-card class="tile" :bordered="true">
      <template #header>
        <div class="tile-header"><n-icon><BarChartOutline /></n-icon><span>Hoy</span></div>
      </template>
      <div class="kpi">
        <div class="kpi-value">{{ currency( revenueToday ) }}</div>
        <div class="kpi-sub">Ingresos</div>
      </div>
    </n-card>
    <n-card class="tile" :bordered="true">
      <template #header>
        <div class="tile-header"><n-icon><ListOutline /></n-icon><span>Órdenes</span></div>
      </template>
      <div class="kpi">
        <div class="kpi-value">{{ ordersToday }}</div>
        <div class="kpi-sub">Procesadas</div>
      </div>
    </n-card>
    <n-card class="tile" :bordered="true">
      <template #header>
        <div class="tile-header"><n-icon><PersonOutline /></n-icon><span>Usuarios activos</span></div>
      </template>
      <div class="kpi">
        <div class="kpi-value">{{ activeUsers }}</div>
        <div class="kpi-sub">Staff conectado</div>
      </div>
    </n-card>
  </div>

  <n-card class="mt" :bordered="true">
    <template #header>
      <div class="tile-header"><n-icon><TrendingUpOutline /></n-icon><span>Actividad reciente</span></div>
    </template>
    <n-data-table :columns="columns" :data="recent" size="small" :bordered="false" />
  </n-card>
  
</template>

<script setup lang="ts">
import { h, ref } from 'vue';
import { NIcon, type DataTableColumns } from 'naive-ui';
import { BarChartOutline, ListOutline, PersonOutline, TrendingUpOutline } from '@vicons/ionicons5';

const revenueToday = ref(235000);
const ordersToday = ref(57);
const activeUsers = ref(6);
const recent = ref([
  { time: '10:02', event: 'Orden #1245 aceptada', actor: 'Ana' },
  { time: '09:51', event: 'Ingrediente "Tomate" repuesto', actor: 'Juan' },
  { time: '09:33', event: 'Orden #1244 entregada', actor: 'Luis' },
]);

const columns: DataTableColumns<any> = [
  { title: 'Hora', key: 'time', width: 120 },
  { title: 'Evento', key: 'event' },
  { title: 'Usuario', key: 'actor', width: 160 }
];

const currency = (v: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
</script>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.tile-header { display:flex; align-items:center; gap:8px; font-weight:600; }
.kpi { display:flex; flex-direction:column; align-items:flex-start; gap:2px; }
.kpi-value { font-size: 28px; font-weight: 700; }
.kpi-sub { color: rgba(0,0,0,.45); }
.mt { margin-top: 12px; }
</style>

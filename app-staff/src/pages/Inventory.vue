<template>
  <section class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <h3 style="margin:0">Inventario</h3>
      <div>
        <button class="btn" @click="refresh" :disabled="loading">Recargar</button>
      </div>
    </div>
    <div v-if="loading" class="muted" style="margin-top:8px">Cargando…</div>
    <div v-if="error" style="color:#b71c1c">{{ error }}</div>
    <table class="table" v-if="!loading">
      <thead>
        <tr>
          <th>Item</th>
          <th>Categoría</th>
          <th>Stock</th>
          <th>Umbral</th>
          <th>Disponibilidad</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in items" :key="it.id">
          <td>{{ it.name }}</td>
          <td>{{ it.categoryId }}</td>
          <td>
            <strong>{{ it.stock ?? 0 }}</strong>
          </td>
          <td>
            <input class="input" type="number" min="0" style="max-width:90px" v-model.number="thresholds[it.id]" @change="saveThreshold(it)" />
          </td>
          <td>
            <span :style="availabilityStyle(it)">{{ availabilityLabel(it) }}</span>
          </td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn" @click="changeStock(it, -5)">-5</button>
              <button class="btn" @click="changeStock(it, -1)">-1</button>
              <button class="btn" @click="changeStock(it, 1)">+1</button>
              <button class="btn" @click="changeStock(it, 5)">+5</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Item } from '../types';
import { getStaffItems, adjustStock, upsertItem, tryApi, mockApi } from '../lib/api';

const items = ref<Item[]>([]);
const loading = ref(true);
const error = ref('');
const thresholds = ref<Record<string, number>>({});

async function load() {
  error.value = '';
  loading.value = true;
  try {
    items.value = await tryApi(() => getStaffItems(), () => mockApi.getItems());
    thresholds.value = Object.fromEntries(items.value.map(it => [it.id, it.lowStockThreshold ?? 0]));
  } catch (e: any) {
    error.value = e?.message || String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function availabilityLabel(it: Item) {
  const stock = it.stock ?? 0;
  const thr = it.lowStockThreshold ?? 0;
  if (stock <= 0) return 'agotado';
  if (thr > 0 && stock <= thr) return 'limitado';
  return 'en stock';
}
function availabilityStyle(it: Item) {
  const label = availabilityLabel(it);
  const color = label === 'agotado' ? '#b71c1c' : label === 'limitado' ? '#f9a825' : '#2e7d32';
  return { background: color, color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '12px' };
}

async function changeStock(it: Item, delta: number) {
  try {
    const res = await tryApi(() => adjustStock(it.id, delta), () => mockApi.adjustStock(it.id, delta));
    const idx = items.value.findIndex(x => x.id === it.id);
    if (idx >= 0) items.value[idx].stock = res.stock;
  } catch (e: any) {
    alert(e?.message || String(e));
  }
}

async function saveThreshold(it: Item) {
  const lowStockThreshold = Math.max(0, Math.floor(thresholds.value[it.id] || 0));
  try {
    await tryApi(
      () => upsertItem(it.id, { lowStockThreshold }),
      () => mockApi.upsertItem(it.id, { lowStockThreshold })
    );
    it.lowStockThreshold = lowStockThreshold;
  } catch (e: any) {
    alert(e?.message || String(e));
  }
}

function refresh() { load(); }
</script>

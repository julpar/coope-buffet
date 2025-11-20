<template>
  <div class="menu">
    <h2>Menú</h2>
    <div v-if="loading" class="muted">Cargando…</div>
    <div v-else>
      <section v-for="cat in data.categories" :key="cat.id" class="cat">
        <h3>{{ cat.name }}</h3>
        <div class="grid">
          <n-card v-for="it in cat.items" :key="it.id" size="small" :embedded="true">
            <div class="it">
              <div class="meta">
                <div class="title">
                  <strong>{{ it.name }}</strong>
                  <n-tag v-if="it.isGlutenFree" type="success" size="medium">SIN TACC</n-tag>
                </div>
                <div class="price">{{ currency(it.price) }}</div>
              </div>
              <div class="actions">
                <small v-if="it.availability==='sold-out'" class="sold">Sin stock</small>
                <small v-else-if="it.availability==='limited'" class="limited">Stock limitado</small>
                <n-button size="medium" type="primary" :disabled="it.availability==='sold-out'" @click="add(it)">Agregar</n-button>
              </div>
            </div>
          </n-card>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { MenuResponse, Item } from '../types';
import { customerApi } from '../lib/api';
import { cart } from '../lib/cart';

const loading = ref(true);
const data = reactive<MenuResponse>({ categories: [], glutenFree: [] });

function normalizeAvailability(it: Item): Item {
  const stock = it.stock ?? 0;
  const thr = it.lowStockThreshold ?? 0;
  let availability: Item['availability'] = 'in-stock';
  if (stock <= 0) availability = 'sold-out';
  else if (thr > 0 && stock <= thr) availability = 'limited';
  return { ...it, availability };
}

// Monetary values now come in ARS units (not cents)
function currency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

function add(it: Item) { cart.add(it, 1); }

onMounted(async () => {
  try {
    const res = await customerApi.getMenu();
    data.categories = res.categories.map(c => ({
      ...c,
      items: (c.items || []).map(normalizeAvailability)
    }));
    data.glutenFree = (res.glutenFree || []).map(normalizeAvailability);
  } catch (e) {
    // leave empty
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.muted { color: #666; }
.menu { display: flex; flex-direction: column; gap: 12px; }
.cat { margin-bottom: 12px; }
.grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
/* Force one item per line at all viewport sizes */
@media (min-width: 700px) { .grid { grid-template-columns: 1fr; } }
.it { display: flex; flex-direction: column; gap: 8px; }
.meta { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.title { display: flex; align-items: center; gap: 6px; }
.price { font-weight: 600; }
.actions { display: flex; align-items: center; }
.actions > :last-child { margin-left: auto; }
.sold { color: #b71c1c; font-weight: 600; }
.limited { color: #ef6c00; font-weight: 600; }
</style>

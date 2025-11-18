<template>
  <div class="row">
    <section class="col card">
      <h3 style="margin:0 0 8px">Órdenes</h3>
      <div class="row">
        <div class="col">
          <strong>{{ counters.awaitingCash }}</strong>
          <div class="muted">Pendiente (cash)</div>
        </div>
        <div class="col">
          <strong>{{ counters.received }}</strong>
          <div class="muted">Recibidas</div>
        </div>
        <div class="col">
          <strong>{{ counters.preparing }}</strong>
          <div class="muted">Preparando</div>
        </div>
        <div class="col">
          <strong>{{ counters.ready }}</strong>
          <div class="muted">Listas</div>
        </div>
      </div>
      <RouterLink class="btn" style="margin-top:12px" to="/orders">Ir a órdenes →</RouterLink>
    </section>

    <section class="col card">
      <h3 style="margin:0 0 8px">Stock</h3>
      <div v-if="loading" class="muted">Cargando…</div>
      <template v-else>
        <div v-if="low.length === 0" class="muted">Sin alertas de stock bajo</div>
        <ul v-else>
          <li v-for="it in low" :key="it.id">
            {{ it.name }} — stock: <strong>{{ it.stock ?? 0 }}</strong>
            <RouterLink class="btn ghost" style="margin-left:8px" to="/inventory">Ajustar</RouterLink>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useOrders } from '../store/orders';
import { getStaffItems, tryApi, mockApi } from '../lib/api';
import type { Item } from '../types';

const { counters } = useOrders();
const loading = ref(true);
const items = ref<Item[]>([]);

onMounted(async () => {
  loading.value = true;
  items.value = await tryApi(() => getStaffItems(), () => mockApi.getItems());
  loading.value = false;
});

const low = computed(() => items.value.filter(i => (i.stock ?? 0) <= (i.lowStockThreshold ?? 0)));
</script>

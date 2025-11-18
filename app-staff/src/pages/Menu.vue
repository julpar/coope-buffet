<template>
  <div class="row">
    <section class="col card">
      <h3 style="margin:0 0 8px">Categorías</h3>
      <form @submit.prevent="saveCategory" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <input class="input" style="max-width:160px" placeholder="id" v-model.trim="catForm.id" required />
        <input class="input" style="min-width:220px" placeholder="Nombre" v-model.trim="catForm.name" required />
        <input class="input" style="max-width:100px" type="number" placeholder="Orden" v-model.number="catForm.order" />
        <button class="btn primary" :disabled="savingCat">{{ savingCat ? 'Guardando…' : 'Guardar' }}</button>
      </form>
      <ul>
        <li v-for="c in categories" :key="c.id">
          <strong>{{ c.name }}</strong>
          <span class="muted">({{ c.id }})</span>
          <span class="muted" v-if="c.order"> · orden {{ c.order }}</span>
        </li>
      </ul>
    </section>

    <section class="col card">
      <h3 style="margin:0 0 8px">Items</h3>
      <form @submit.prevent="saveItem" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <input class="input" style="max-width:140px" placeholder="id" v-model.trim="itemForm.id" required />
        <input class="input" style="min-width:200px" placeholder="Nombre" v-model.trim="itemForm.name" required />
        <select class="input" v-model="itemForm.categoryId" required>
          <option disabled value="">Categoría…</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <input class="input" style="max-width:120px" type="number" min="0" placeholder="Precio" v-model.number="itemForm.price" required />
        <label style="display:flex;align-items:center;gap:6px">
          <input type="checkbox" v-model="itemForm.isGlutenFree" /> GF
        </label>
        <label style="display:flex;align-items:center;gap:6px">
          <input type="checkbox" v-model="itemForm.active" /> Activo
        </label>
        <button class="btn primary" :disabled="savingItem">{{ savingItem ? 'Guardando…' : 'Guardar' }}</button>
      </form>

      <table class="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>GF</th>
            <th>Stock</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in items" :key="it.id">
            <td>
              <strong>{{ it.name }}</strong>
              <div class="muted">{{ it.id }}</div>
            </td>
            <td>{{ it.categoryId }}</td>
            <td>${{ it.price }}</td>
            <td>{{ it.isGlutenFree ? 'Sí' : 'No' }}</td>
            <td>{{ it.stock ?? 0 }}</td>
            <td>{{ availabilityLabel(it) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Category, Item } from '../types';
import { getStaffCategories, upsertCategory, getStaffItems, upsertItem, tryApi, mockApi } from '../lib/api';

const categories = ref<Category[]>([]);
const items = ref<Item[]>([]);
const savingCat = ref(false);
const savingItem = ref(false);

const catForm = ref<Partial<Category>>({ id: '', name: '', order: undefined });
const itemForm = ref<Partial<Item>>({ id: '', name: '', categoryId: '', price: 0, isGlutenFree: false, active: true });

onMounted(async () => {
  categories.value = await tryApi(() => getStaffCategories(), () => mockApi.getCategories());
  items.value = await tryApi(() => getStaffItems(), () => mockApi.getItems());
});

function availabilityLabel(it: Item) {
  const stock = it.stock ?? 0;
  const thr = it.lowStockThreshold ?? 0;
  if (stock <= 0) return 'agotado';
  if (thr > 0 && stock <= thr) return 'limitado';
  return 'en stock';
}

async function saveCategory() {
  if (!catForm.value.id || !catForm.value.name) return;
  try {
    savingCat.value = true;
    const c = await tryApi(
      () => upsertCategory(catForm.value.id!, { name: catForm.value.name!, order: catForm.value.order }),
      () => mockApi.upsertCategory(catForm.value.id!, { name: catForm.value.name!, order: catForm.value.order })
    );
    const i = categories.value.findIndex(x => x.id === c.id);
    if (i >= 0) categories.value[i] = c; else categories.value.push(c);
    catForm.value = { id: '', name: '', order: undefined };
  } catch (e: any) {
    alert(e?.message || String(e));
  } finally {
    savingCat.value = false;
  }
}

async function saveItem() {
  if (!itemForm.value.id || !itemForm.value.name || !itemForm.value.categoryId) return;
  try {
    savingItem.value = true;
    const payload = {
      name: itemForm.value.name!,
      categoryId: itemForm.value.categoryId!,
      price: Number(itemForm.value.price || 0),
      isGlutenFree: !!itemForm.value.isGlutenFree,
      active: itemForm.value.active !== false,
    };
    const it = await tryApi(
      () => upsertItem(itemForm.value.id!, payload),
      () => mockApi.upsertItem(itemForm.value.id!, payload)
    );
    const i = items.value.findIndex(x => x.id === it.id);
    if (i >= 0) items.value[i] = it; else items.value.push(it);
    itemForm.value = { id: '', name: '', categoryId: '', price: 0, isGlutenFree: false, active: true };
  } catch (e: any) {
    alert(e?.message || String(e));
  } finally {
    savingItem.value = false;
  }
}
</script>

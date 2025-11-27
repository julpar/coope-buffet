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
              <!-- Left thumbnail + right content -->
              <div class="row">
                <div class="thumb-cell" @click="it.imageUrl ? openImage(it.imageUrl, it.name) : null" :aria-label="it.imageUrl ? 'Ver imagen de ' + it.name : undefined" role="button" :tabindex="it.imageUrl ? 0 : -1" @keydown.enter.prevent="it.imageUrl ? openImage(it.imageUrl, it.name) : null" :style="it.imageUrl ? 'cursor: zoom-in;' : ''">
                  <template v-if="it.imageUrl">
                    <img :src="it.imageUrl" :alt="it.name" loading="lazy" class="thumb-img" />
                  </template>
                  <template v-else>
                    <span class="thumb-letter">{{ (it.name || '?').toString().trim().charAt(0).toUpperCase() || '?' }}</span>
                  </template>
                </div>
                <div class="content">
                  <div class="meta">
                    <div class="title">
                      <strong>{{ it.name }}</strong>
                      <n-tag v-if="it.isGlutenFree" type="success" size="small">SIN TACC</n-tag>
                    </div>
                    <div class="price">{{ currency(it.price) }}</div>
                  </div>
                  <div class="actions">
                    <small v-if="it.availability==='sold-out'" class="sold">Sin stock</small>
                    <small v-else-if="it.availability==='limited'" class="limited">Stock limitado</small>
                    <n-button size="small" type="primary" :disabled="it.availability==='sold-out'" @click="add(it)">Agregar</n-button>
                  </div>
                </div>
              </div>
            </div>
          </n-card>
        </div>
      </section>
    </div>
  </div>
  <!-- Image preview modal (custom overlay to ensure centered rendering across environments) -->
  <div v-if="showImage" class="img-modal" role="dialog" aria-modal="true" :aria-label="imageTitle || 'Imagen'" @click="closeImage">
    <div class="img-modal-content" @click.stop>
      <button class="img-modal-close" type="button" aria-label="Cerrar" @click="closeImage">×</button>
      <div v-if="imageTitle" class="img-modal-title">{{ imageTitle }}</div>
      <img v-if="imageUrl" :src="imageUrl" :alt="imageTitle" />
      <div v-else class="img-modal-fallback">Sin imagen</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref } from 'vue';
import type { MenuResponse, Item } from '../types';
import { customerApi } from '../lib/api';
import { cart } from '../lib/cart';

const loading = ref(true);
const data = reactive<MenuResponse>({ categories: [], glutenFree: [] });
const showImage = ref(false);
const imageUrl = ref<string | null>(null);
const imageTitle = ref<string>('');

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

function openImage(url: string, title: string) {
  imageUrl.value = url;
  imageTitle.value = title || '';
  showImage.value = true;
}

function closeImage() {
  showImage.value = false;
}

async function fetchMenu() {
  loading.value = true;
  try {
    const res = await customerApi.getMenu();
    data.categories = res.categories.map(c => ({
      ...c,
      items: (c.items || []).map(normalizeAvailability)
    }));
    data.glutenFree = (res.glutenFree || []).map(normalizeAvailability);
  } catch (e) {
    // keep previous data if request fails
  } finally {
    loading.value = false;
  }
}

function onRefreshMenu() {
  // Re-fetch the menu when the header triggers a refresh
  fetchMenu();
}

onMounted(() => {
  fetchMenu();
  window.addEventListener('refresh-menu', onRefreshMenu as EventListener);
  // Close modal on Escape
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('refresh-menu', onRefreshMenu as EventListener);
  window.removeEventListener('keydown', onKeyDown);
});

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showImage.value) {
    e.preventDefault();
    closeImage();
  }
}
</script>

<style scoped>
.muted { color: #666; }
.menu { display: flex; flex-direction: column; gap: 12px; }
.cat { margin-bottom: 12px; }
.grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
/* Force one item per line at all viewport sizes */
@media (min-width: 700px) { .grid { grid-template-columns: 1fr; } }
.it { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; gap: 10px; align-items: center; }
.content { flex: 1; min-width: 0; }
.thumb-cell { width: 40px; height: 40px; border-radius: 6px; overflow: hidden; background: #f3f3f3; border: 1px solid #e5e5e5; display: flex; align-items: center; justify-content: center; }
.thumb-cell:focus { outline: 2px solid #4098fc; outline-offset: 2px; }
.thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-letter { color: #555; font-weight: 600; font-size: 12px; }
.meta { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.title { display: flex; align-items: center; gap: 6px; }
.price { font-weight: 600; }
.actions { display: flex; align-items: center; }
.actions > :last-child { margin-left: auto; }
.sold { color: #b71c1c; font-weight: 600; }
.limited { color: #ef6c00; font-weight: 600; }
/* Centered image modal overlay */
.img-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.img-modal-content { position: relative; max-width: 90vw; max-height: 80vh; display: flex; align-items: center; justify-content: center; }
.img-modal-content img { max-width: 90vw; max-height: 80vh; object-fit: contain; display: block; border-radius: 6px; box-shadow: 0 6px 30px rgba(0,0,0,0.4); }
.img-modal-fallback { color: #fff; }
.img-modal-close { position: absolute; top: -10px; right: -10px; background: #000c; color: #fff; border: none; width: 32px; height: 32px; border-radius: 16px; font-size: 20px; line-height: 32px; cursor: pointer; }
/* Modal title */
.img-modal-title {
  position: absolute;
  top: -42px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-weight: 600;
  text-align: center;
  max-width: 86vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Solid background for readability over any image */
  background: #111;
  padding: 6px 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
</style>

<template>
  <div class="page">
    <div class="toolbar">
      <n-input
        v-model:value="q"
        placeholder="Buscar plato..."
        clearable
        class="grow2"
      >
        <template #prefix>
          <n-icon size="16">
            <SearchOutline />
          </n-icon>
        </template>
      </n-input>
      <n-select
        v-model:value="selectedCategory"
        :options="categoryFilterOptions"
        placeholder="Todas las categorías"
        class="filter"
        :style="categorySelectStyle"
      />
      <n-button
        type="primary"
        @click="openCreate"
      >
        <template #icon>
          <n-icon><AddOutline /></n-icon>
        </template>
        Nuevo plato
      </n-button>
      <n-button
        tertiary
        :loading="loading"
        @click="refresh"
      >
        <template #icon>
          <n-icon><RefreshOutline /></n-icon>
        </template>
        Refrescar
      </n-button>
    </div>
    <div class="table-wrap">
      <n-data-table
        :columns="columns"
        :data="filtered"
        :loading="loading"
        :bordered="true"
        :scroll-x="840"
      />
    </div>

    <!-- Add/Edit item modal -->
    <n-modal
      v-model:show="showEditor"
      preset="card"
      :title="editorTitle"
      style="max-width:520px; width:92vw;"
    >
      <div class="form">
        <n-form
          :model="form"
          label-placement="top"
        >
          <div class="row">
            <n-form-item
              label="ID"
              path="id"
            >
              <n-input
                v-model:value="form.id"
                placeholder="ID corto (ej. A7F2C)"
                :disabled="isEditing"
              />
            </n-form-item>
            <n-form-item
              label="Categoría"
              path="categoryId"
            >
              <n-select
                v-model:value="form.categoryId"
                :options="categoryOptions"
                placeholder="Categoría"
              />
            </n-form-item>
          </div>
          <n-form-item
            label="Nombre"
            path="name"
          >
            <n-input
              v-model:value="form.name"
              placeholder="Nombre del plato"
            />
          </n-form-item>
          <div class="row">
            <n-form-item
              label="Precio"
              path="price"
            >
              <n-input-number
                v-model:value="form.price"
                :min="0"
                :step="10"
                placeholder="0"
                :show-button="false"
                :input-props="{ inputmode: 'decimal', pattern: '[0-9]*' }"
              />
            </n-form-item>
            <n-form-item
              label="Stock"
              path="stock"
            >
              <n-input-number
                v-model:value="form.stock"
                :min="0"
                :step="1"
                placeholder="0"
                :input-props="{ inputmode: 'numeric', pattern: '[0-9]*' }"
              />
            </n-form-item>
          </div>
          <div class="row">
            <n-form-item
              label="Umbral de bajo stock"
              path="lowStockThreshold"
            >
              <n-input-number
                v-model:value="form.lowStockThreshold"
                :min="0"
                :step="1"
                placeholder="0"
                :input-props="{ inputmode: 'numeric', pattern: '[0-9]*' }"
              />
            </n-form-item>
            <n-form-item
              label="Sin TACC"
              path="isGlutenFree"
            >
              <n-switch v-model:value="form.isGlutenFree" />
            </n-form-item>
          </div>
          <n-form-item
            label="Activo"
            path="active"
          >
            <n-switch v-model:value="form.active" />
          </n-form-item>
          <n-form-item
            label="Imagen"
            path="imageUrl"
          >
            <div style="display:flex; flex-direction:column; gap:8px; width:100%">
              <div style="display:flex; align-items:center; gap:8px;">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  style="display:none"
                  @change="onPickImage"
                >
                <!-- Camera capture input (mobile devices will offer camera) -->
                <input
                  ref="cameraInput"
                  type="file"
                  accept="image/*;capture=camera"
                  capture="environment"
                  style="display:none"
                  @change="onPickImage"
                >
                <n-button
                  :loading="uploadingImage"
                  @click="() => fileInput?.click()"
                >
                  Seleccionar imagen
                </n-button>
                <n-button
                  :loading="uploadingImage"
                  tertiary
                  @click="openCamera"
                >
                  Tomar foto
                </n-button>
                <n-button
                  v-if="form.imageUrl"
                  quaternary
                  @click="clearImage"
                >
                  Quitar imagen
                </n-button>
              </div>
              <div
                v-if="form.imageUrl"
                style="display:flex; gap:8px; align-items:center;"
              >
                <img
                  :src="form.imageUrl as string"
                  alt="preview"
                  style="max-width:160px; max-height:100px; object-fit:cover; border-radius:6px; border:1px solid #ddd;"
                >
                <a
                  :href="form.imageUrl as string"
                  target="_blank"
                  rel="noreferrer"
                >Abrir</a>
              </div>
              <div
                v-else
                style="color:#777; font-size:12px;"
              >
                No hay imagen. Puede seleccionar un archivo o tomar una foto. Las imágenes se redimensionan a un máximo de 1024px por lado (límite 5MB).
              </div>
            </div>
          </n-form-item>
        </n-form>
      </div>
      <template #action>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <n-button @click="showEditor = false">
            Cancelar
          </n-button>
          <n-button
            type="primary"
            :loading="saving"
            @click="saveItem"
          >
            Guardar
          </n-button>
        </div>
      </template>
    </n-modal>
    <!-- Camera modal -->
    <n-modal
      v-model:show="showCamera"
      preset="card"
      title="Tomar foto"
      style="max-width:520px; width:92vw;"
    >
      <div style="display:flex; flex-direction:column; gap:8px;">
        <video
          ref="videoEl"
          autoplay
          playsinline
          style="width:100%; max-height:360px; background:#000; border-radius:6px;"
        />
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <n-button @click="closeCamera">
            Cancelar
          </n-button>
          <n-button
            type="primary"
            :loading="uploadingImage"
            @click="capturePhoto"
          >
            Tomar
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, computed, ref, onMounted } from 'vue';
import { NTag, NButton, NIcon, useMessage, type DataTableColumns } from 'naive-ui';
import { AddOutline, CreateOutline, CopyOutline, TrashOutline, SearchOutline, RefreshOutline } from '@vicons/ionicons5';
import type { Item, Category } from '../types';
import { staffApi, getStaffItems } from '../lib/api';

const q = ref('');
const loading = ref(false);
const items = ref<Item[]>([]);
const message = useMessage();
const categories = ref<Category[]>([]);
const selectedCategory = ref<string>('all');
const showEditor = ref(false);
const saving = ref(false);
const editing = ref<Item | null>(null);
const form = ref<Partial<Item & { id: string }>>({ id: '', name: '', categoryId: '', price: 0, stock: 0, lowStockThreshold: 0, isGlutenFree: false, active: true });
const uploadingImage = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const cameraInput = ref<HTMLInputElement | null>(null);
const showCamera = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
let _mediaStream: MediaStream | null = null;

// Resize helper: ensures the longest side is <= 1024px. Returns a new File (JPEG by default) or the original file if not an image.
async function resizeToMax1024(input: File | Blob, filename = 'image.jpg', contentType?: string): Promise<File> {
  const type = (contentType || (input as File).type || 'image/jpeg');
  if (!type.startsWith('image/')) {
    // Not an image; return original as File if possible
    if (input instanceof File) return input;
    return new File([input], filename, { type });
  }
  // Read into an HTMLImageElement
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error || new Error('read error'));
    fr.readAsDataURL(input);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('image load error'));
    im.src = dataUrl;
  });
  let { width: w, height: h } = img;
  if (!w || !h) {
    // Fallback to original blob
    return input instanceof File ? input : new File([input], filename, { type });
  }
  const MAX = 1024;
  let newW = w;
  let newH = h;
  if (w > h && w > MAX) {
    newW = MAX;
    newH = Math.round((h * MAX) / w);
  } else if (h >= w && h > MAX) {
    newH = MAX;
    newW = Math.round((w * MAX) / h);
  }
  // If no resizing needed, just return original
  if (newW === w && newH === h) {
    return input instanceof File ? input : new File([input], filename, { type });
  }
  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return input instanceof File ? input : new File([input], filename, { type });
  ctx.drawImage(img, 0, 0, newW, newH);
  const outType = type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outType === 'image/jpeg' ? 0.9 : undefined;
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode error'))), outType, quality as any);
  });
  const outName = filename.endsWith('.png') && outType === 'image/png'
    ? filename
    : filename.replace(/\.(jpe?g|png)$/i, '') + (outType === 'image/png' ? '.png' : '.jpg');
  return new File([blob], outName, { type: outType });
}

function availabilityOf(it: Item): 'in-stock' | 'limited' | 'sold-out' {
  const stock = it.stock ?? 0;
  const low = it.lowStockThreshold ?? 0;
  if (stock <= 0) return 'sold-out';
  if (low > 0 && stock <= low) return 'limited';
  return 'in-stock';
}

const rows = computed(() => items.value.map(it => ({
  ...it,
  priceFmt: currency(it.price),
  availability: it.availability || availabilityOf(it),
})));

const filtered = computed(() => rows.value.filter(r => {
  const byCat = selectedCategory.value === 'all' || r.categoryId === selectedCategory.value;
  const byText = !q.value || r.name.toLowerCase().includes(q.value.toLowerCase());
  return byCat && byText;
}));

const columns: DataTableColumns<any> = [
  // Thumbnail column on the left
  { title: '', key: 'thumb', width: 64, render: (row: any) => {
      const url = row.imageUrl as string | null | undefined;
      if (url) {
        // Use inline styles to guarantee constraint even if scoped CSS fails to apply inside DataTable
        return h('div', { class: 'thumb-cell', style: 'width:40px;height:40px;border-radius:6px;overflow:hidden;background:#f3f3f3;border:1px solid #e5e5e5;display:flex;align-items:center;justify-content:center;' }, [
          h('img', { src: url, alt: row.name, loading: 'lazy', class: 'thumb-img', style: 'width:100%;height:100%;object-fit:cover;display:block;' })
        ]);
      }
      // Placeholder when no image
      const letter = (row.name || '?').toString().trim().charAt(0).toUpperCase() || '?';
      return h('div', { class: 'thumb-cell placeholder', style: 'width:40px;height:40px;border-radius:6px;overflow:hidden;background:#f5f5f5;border:1px solid #e5e5e5;display:flex;align-items:center;justify-content:center;color:#555;font-weight:600;font-size:12px;' }, letter);
    }
  },
  { title: 'Plato', key: 'name', minWidth: 200, ellipsis: true },
  { title: 'Precio', key: 'priceFmt', width: 140 },
  { title: 'Stock', key: 'stock', width: 100 },
  { title: 'Disponible', key: 'availability', width: 160, render: (row: any) => {
      // Combine the "active" state with stock availability to determine the label
      const isActive = row.active !== false; // default to true when undefined
      if (!isActive) {
        return h(NTag, { type: 'error' }, { default: () => 'No' });
      }
      const t = row.availability === 'sold-out' ? 'error' : row.availability === 'limited' ? 'warning' : 'success';
      const label = row.availability === 'sold-out' ? 'No' : row.availability === 'limited' ? 'Bajo' : 'Sí';
      return h(NTag, { type: t }, { default: () => label });
    }
  },
  { title: 'Acciones', key: 'actions', width: 300, render: (row: any) => h('div', { style: 'display:flex; gap:8px; white-space: nowrap;' }, [
      h(NButton, { quaternary: true, size: 'small', onClick: () => openEdit(row) }, { default: () => 'Editar', icon: () => h('i', { class: 'n-icon' }, h(CreateOutline)) }),
      h(NButton, { quaternary: true, size: 'small', onClick: () => openDuplicate(row) }, { default: () => 'Duplicar', icon: () => h('i', { class: 'n-icon' }, h(CopyOutline)) }),
      h(NButton, { quaternary: true, size: 'small', type: 'error', onClick: () => confirmDelete(row) }, { default: () => 'Eliminar', icon: () => h('i', { class: 'n-icon' }, h(TrashOutline)) })
    ])
  }
];

async function refresh() {
  loading.value = true;
  try {
    const [its, cats] = await Promise.all([getStaffItems(), staffApi.getCategories()]);
    items.value = its;
    categories.value = cats;
  } catch (err: any) {
    console.error(err);
    message.error('No se pudo cargar el menú desde el servidor');
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

function currency(v: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
}

const isEditing = computed(() => !!editing.value);
const editorTitle = computed(() => (isEditing.value ? 'Editar plato' : 'Nuevo plato'));
const categoryOptions = computed(() => categories.value.map(c => ({ label: c.name, value: c.id })));
const categoryFilterOptions = computed(() => [{ label: 'Todas', value: 'all' }, ...categoryOptions.value]);

// Dynamically size the category filter to the longest label so it doesn't look oversized
const categorySelectCh = computed(() => {
  const labels = categoryFilterOptions.value.map(o => String((o as any).label || ''));
  const longest = labels.reduce((m, s) => Math.max(m, s.length), 0);
  // Ensure a sane minimum (e.g., 6ch) and cap the maximum width (e.g., 26ch)
  const min = 6, max = 26;
  return Math.min(Math.max(longest, min), max);
});
const categorySelectStyle = computed(() => {
  // Add extra pixels for the dropdown arrow and paddings (~56px works well in Naive UI)
  const extraPx = 56;
  return {
    width: `calc(${categorySelectCh.value}ch + ${extraPx}px)`,
    flex: '0 0 auto',
    whiteSpace: 'nowrap',
  } as any;
});

function randomId(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function openCreate() {
  editing.value = null;
  form.value = { id: randomId(), name: '', categoryId: categories.value[0]?.id || 'otros', price: 0, stock: 0, lowStockThreshold: 0, isGlutenFree: false, active: true };
  showEditor.value = true;
}

function openEdit(row: Item) {
  editing.value = row;
  form.value = { id: row.id, name: row.name, categoryId: row.categoryId, price: row.price, stock: row.stock || 0, lowStockThreshold: row.lowStockThreshold || 0, isGlutenFree: !!row.isGlutenFree, active: row.active !== false, imageUrl: row.imageUrl || undefined };
  showEditor.value = true;
}

function openDuplicate(row: Item) {
  editing.value = null;
  form.value = { id: randomId(), name: row.name + ' (copia)', categoryId: row.categoryId, price: row.price, stock: row.stock || 0, lowStockThreshold: row.lowStockThreshold || 0, isGlutenFree: !!row.isGlutenFree, active: row.active !== false };
  showEditor.value = true;
}

async function openCamera() {
  // Prefer in-app camera using MediaDevices when available
  try {
    if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
      // Fallback to native file input with capture hint
      cameraInput.value?.click();
      return;
    }
    showCamera.value = true;
    // A tiny delay to let modal mount the video element
    await new Promise((r) => setTimeout(r, 50));
    _mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    if (videoEl.value) {
      videoEl.value.srcObject = _mediaStream;
      await videoEl.value.play().catch(() => {});
    }
  } catch (err) {
    console.warn('getUserMedia failed, falling back to input', err);
    showCamera.value = false;
    cameraInput.value?.click();
  }
}

function stopStream() {
  if (_mediaStream) {
    _mediaStream.getTracks().forEach((t) => t.stop());
    _mediaStream = null;
  }
}

function closeCamera() {
  stopStream();
  showCamera.value = false;
}

async function capturePhoto() {
  try {
    if (!videoEl.value) return;
    const video = videoEl.value;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    // Compute target dims within 1024px box
    const MAX = 1024;
    let tw = w, th = h;
    if (w > h && w > MAX) { tw = MAX; th = Math.round((h * MAX) / w); }
    else if (h >= w && h > MAX) { th = MAX; tw = Math.round((w * MAX) / h); }
    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, tw, th);
    uploadingImage.value = true;
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/jpeg', 0.9);
    });
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const { url } = await staffApi.uploadImage(file);
    form.value.imageUrl = url;
    message.success('Foto subida');
    closeCamera();
  } catch (err) {
    console.error(err);
    message.error('No se pudo tomar/subir la foto');
  } finally {
    uploadingImage.value = false;
  }
}

async function onPickImage(e: Event) {
  const el = e.target as HTMLInputElement;
  const file = el.files && el.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    message.warning('La imagen supera los 5MB');
    el.value = '';
    return;
  }
  try {
    uploadingImage.value = true;
    // Ensure max 1024px on the longest side before uploading
    const resized = await resizeToMax1024(file, file.name, file.type);
    const { url } = await staffApi.uploadImage(resized);
    form.value.imageUrl = url;
    message.success('Imagen subida');
  } catch (err: any) {
    console.error(err);
    message.error('No se pudo subir la imagen');
  } finally {
    uploadingImage.value = false;
    try { el.value = ''; } catch { void 0; }
  }
}

function clearImage() {
  form.value.imageUrl = undefined;
}

async function saveItem() {
  if (!form.value.id || !form.value.name || !form.value.categoryId) {
    message.warning('Complete ID, Nombre y Categoría');
    return;
  }
  saving.value = true;
  try {
    await staffApi.upsertItem(form.value.id!, {
      name: form.value.name,
      categoryId: form.value.categoryId!,
      price: Number(form.value.price || 0),
      stock: Number(form.value.stock || 0),
      lowStockThreshold: Number(form.value.lowStockThreshold || 0),
      isGlutenFree: !!form.value.isGlutenFree,
      active: form.value.active !== false,
      imageUrl: form.value.imageUrl ?? null,
    });
    message.success(isEditing.value ? 'Plato actualizado' : 'Plato creado');
    showEditor.value = false;
    await refresh();
  } catch (err: any) {
    console.error(err);
    message.error('No se pudo guardar el plato');
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(row: Item) {
  if (!window.confirm(`¿Eliminar "${row.name}"? Esta acción no se puede deshacer.`)) return;
  try {
    await staffApi.deleteItem(row.id);
    message.success('Plato eliminado');
    await refresh();
  } catch (err: any) {
    console.error(err);
    message.error('No se pudo eliminar el plato');
  }
}
</script>

<style scoped>
.page { display:flex; flex-direction:column; gap:12px; }
.toolbar { display:flex; gap:8px; align-items:center; }
.grow { flex:1; }
.grow2 { flex:2; }
.table-wrap { overflow-x: auto; }
/* Prevent header letters stacking vertically when space is tight */
:deep(.n-data-table-th) { white-space: nowrap; }
.form { display:flex; flex-direction:column; gap:8px; }
.row { display:flex; gap:8px; }
.row > * { flex:1; }
/* Thumbnail cell styles */
.thumb-cell { width:40px; height:40px; border-radius:6px; overflow:hidden; background:#f3f3f3; border:1px solid #e5e5e5; display:flex; align-items:center; justify-content:center; color:#555; font-weight:600; font-size:12px; }
.thumb-cell.placeholder { background:#f5f5f5; }
.thumb-img { width:100%; height:100%; object-fit:cover; display:block; }
</style>

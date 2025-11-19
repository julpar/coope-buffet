<template>
  <div class="page">
    <div class="toolbar">
      <n-input v-model:value="q" placeholder="Buscar orden..." clearable class="grow">
        <template #prefix>
          <n-icon size="16"><SearchOutline /></n-icon>
        </template>
      </n-input>
      <n-select v-model:value="state" :options="stateOptions" placeholder="Estado" style="width:200px" />
      <n-button type="primary" tertiary :loading="loading" @click="refresh">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
        Actualizar
      </n-button>
    </div>

    <n-data-table
      :columns="columns"
      :data="filtered"
      :bordered="true"
      :loading="loading"
      size="small"
    />
  </div>

  <!-- Detalles de la orden -->
  <n-modal v-model:show="detailsOpen" preset="card" style="max-width: 720px; width: 95vw">
    <template #header>
      <div class="card-header-line">
        <n-tag v-if="selected" size="large" :type="statusTagType(selected)">{{ statusLabel(selected) }}</n-tag>
        <div class="card-title">
          {{ selected ? `Orden ${selected.raw?.shortCode || selected.id}` : 'Orden' }}
        </div>
      </div>
    </template>
    <template v-if="selected">
      <div class="meta-row">
        <!-- Cliente primero: como texto pero resaltado -->
        <span v-if="selected.raw?.customerName" class="customer-highlight">
          <span class="label">Cliente:</span>
          <span class="name">{{ selected.raw.customerName }}</span>
        </span>
        <span v-if="selected.raw?.customerName" style="color:#666">•</span>

        <span>Creada: <strong>{{ fmtDateTime(selected.raw?.createdAt) }}</strong></span>
        <span style="color:#666">•</span>
        <span>ID: <strong>{{ selected.raw?.id }}</strong></span>
        <span class="flex-spacer"></span>
        <span>Total: <strong>{{ selected.total }}</strong></span>
      </div>

      <div v-if="selected.raw?.note" style="margin: 6px 0 12px 0;">
        <n-tag size="small" type="default">Nota</n-tag>
        <span style="margin-left:8px">{{ selected.raw.note }}</span>
      </div>

      <n-table :single-line="false" size="small" bordered>
        <thead>
          <tr>
            <th style="width:72px">Cant.</th>
            <th>Producto</th>
            <th style="width:120px; text-align:right;">Precio</th>
            <th style="width:140px; text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in (selected.raw?.items || [])" :key="it.id">
            <td>{{ it.qty }}</td>
            <td>
              <div style="display:flex; flex-direction:column">
                <strong>{{ it.name || itemName(it.id) }}</strong>
                <small style="color:#888">ID: {{ it.id }}</small>
              </div>
            </td>
            <td style="text-align:right">{{ peso(it.unitPrice) }}</td>
            <td style="text-align:right">{{ peso((it.unitPrice || 0) * (it.qty || 0)) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align:right"><strong>Total</strong></td>
            <td style="text-align:right"><strong>{{ selected.total }}</strong></td>
          </tr>
        </tfoot>
      </n-table>
    </template>
  </n-modal>

</template>

<script setup lang="ts">
import { h, ref, onMounted, watch, computed } from 'vue';
import { useMessage, NTag, NButton, NIcon, NModal, NTable, NTooltip, type DataTableColumns } from 'naive-ui';
import { RefreshOutline, SearchOutline, CheckmarkDoneOutline, CashOutline } from '@vicons/ionicons5';
import { staffApi } from '../lib/api';
import type { Item } from '../types';

type State = 'pending_payment' | 'paid' | 'fulfilled' | 'all';
type Fulfillment = boolean | undefined;
const q = ref('');
// Default to showing all orders (previously defaulted to 'paid')
const state = ref<State>('all');
const loading = ref(false);
const msg = useMessage();
type Row = { id: string; code: string; customer?: string; items: number; total: string; fulfillment: Fulfillment; raw: any };
const rows = ref<Row[]>([]);

// Details modal state
const detailsOpen = ref(false);
const selected = ref<Row | null>(null);

// Optional item name lookup (best-effort)
const itemsById = ref<Record<string, Item>>({});
async function loadItemsLookup() {
  try {
    const items = await staffApi.getItems();
    const map: Record<string, Item> = {};
    (items || []).forEach((it: Item) => { map[it.id] = it; });
    itemsById.value = map;
  } catch {
    // ignore; offline or backend down
  }
}

// Prices are given in currency units (not cents)
const peso = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount || 0);

const stateOptions = [
  { label: 'Todas', value: 'all' },
  { label: 'Esperando pago', value: 'pending_payment' },
  { label: 'Pagadas (en preparación)', value: 'paid' },
  { label: 'Completadas', value: 'fulfilled' },
];

const filtered = computed(() => rows.value.filter(r => {
  const term = q.value?.toLowerCase() || '';
  if (!term) return true;
  return `${r.code}`.toLowerCase().includes(term)
    || `${r.id}`.toLowerCase().includes(term)
    || `${r.customer || ''}`.toLowerCase().includes(term);
}));

function statusLabel(row: Row): string {
  const st = row.raw?.status;
  if (st === 'pending_payment') return 'Pago pendiente';
  if (st === 'paid' && !row.fulfillment) return 'Pagada';
  if (st === 'fulfilled' || !!row.fulfillment) return 'Completada';
  return String(st || '');
}
function statusTagType(row: Row): 'warning' | 'info' | 'success' | 'default' {
  const st = row.raw?.status;
  if (st === 'pending_payment') return 'warning';
  if (st === 'paid' && !row.fulfillment) return 'info';
  if (st === 'fulfilled' || !!row.fulfillment) return 'success';
  return 'default';
}

// Columns are static; visibility/compactness is handled purely with CSS media queries
const columns: DataTableColumns<Row> = [
  // Mobile-only composite column (two-line grid). Hidden on >500px via CSS
  {
    title: 'Orden',
    key: 'combined',
    ellipsis: false,
    className: 'col-mobile',
    titleClassName: 'col-mobile',
    render: (row: Row) => {
      const left1 = h('div', { class: 'g-left1' }, [
        h('span', { class: 'code' }, `#${row.code}`),
        h('span', { class: 'dot', 'aria-hidden': 'true' }, '•'),
        h('span', { class: 'customer cell-ellipsis' }, row.customer || '-')
      ]);
      const right1 = h('div', { class: 'g-right1' }, [
        h('strong', { class: 'total' }, row.total),
        h(NTag, { class: 'status-tag', type: statusTagType(row) }, { default: () => statusLabel(row) })
      ]);

      // Actions: primary first, then details
      const primaryAction = renderAction(row) as any;
      const detailsBtn = (() => {
        const b = h(
          NButton,
          { size: 'small', quaternary: true, onClick: () => openDetails(row), 'aria-label': 'Ver detalles' },
          { icon: () => h(NIcon, { size: 18 }, { default: () => h(SearchOutline) }), default: () => h('span', { class: 'label-text' }, 'Ver detalles') }
        );
        return h(NTooltip, { placement: 'top' }, { trigger: () => b, default: () => 'Ver detalles' });
      })();
      const left2 = h('div', { class: 'g-left2' }, [primaryAction, detailsBtn]);
      const right2 = h('div', { class: 'g-right2' }, [h('span', { class: 'items' }, `Items: ${row.items}`)]);

      return h('div', { class: 'two-line-grid' }, [left1, right1, left2, right2]);
    }
  },
  // Desktop/Tablet columns
  {
    title: 'Detalles',
    key: 'details',
    width: 110,
    className: 'col-details',
    titleClassName: 'col-details',
    render: (row: Row) => {
      const btn = h(
        NButton,
        { size: 'small', onClick: () => openDetails(row), quaternary: true },
        {
          icon: () => h(NIcon, null, { default: () => h(SearchOutline) }),
          default: () => h('span', { class: 'label-text' }, 'Ver')
        }
      );
      return h(NTooltip, { placement: 'top' }, { trigger: () => btn, default: () => 'Ver detalles' });
    }
  },
  { title: '#', key: 'code', width: 120, className: 'col-code', titleClassName: 'col-code' },
  {
    title: 'Cliente',
    key: 'customer',
    width: 200,
    className: 'col-customer',
    titleClassName: 'col-customer',
    render: (row: Row) => h('span', { class: 'cell-ellipsis' }, row.customer || '-')
  },
  { title: 'Items', key: 'items', width: 80, className: 'col-items', titleClassName: 'col-items' },
  { title: 'Total', key: 'total', width: 120, className: 'col-total', titleClassName: 'col-total' },
  {
    title: 'Estado',
    key: 'fulfillment',
    width: 160,
    className: 'col-status',
    titleClassName: 'col-status',
    render: (row: Row) => h(NTag, { class: 'status-tag', type: statusTagType(row) }, { default: () => statusLabel(row) })
  },
  {
    title: 'Cambiar estado',
    key: 'action',
    width: 220,
    className: 'col-action',
    titleClassName: 'col-action',
    render: (row: Row) => renderAction(row)
  }
];

async function refresh() {
  loading.value = true;
  try {
    const list = await staffApi.listOrders(state.value);
    // Always sort newest -> oldest by createdAt (also applies when filters change)
    const sorted = (list || []).slice().sort((a: any, b: any) => {
      const ta = a?.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b?.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
    // Map to rows
    rows.value = sorted.map((o: any) => ({
      id: o.id,
      code: o.shortCode || o.id,
      customer: o.customerName || undefined,
      items: Array.isArray(o.items) ? o.items.reduce((a: number, it: any) => a + (it.qty || 0), 0) : 0,
      total: peso(o.total || 0),
      fulfillment: (o.fulfillment as any) as Fulfillment,
      raw: o,
    }));
  } catch (err: any) {
    console.error(err);
    msg.error('No se pudieron cargar las órdenes');
  } finally {
    loading.value = false;
  }
}

function renderAction(row: Row) {
  const st = row.raw?.status as string;
  if (st === 'fulfilled' || row.fulfillment) return h('span', { style: 'color: #888' }, 'Sin acciones');
  if (st === 'pending_payment') {
    const btn = h(NButton, { size: 'small', tertiary: true, onClick: () => markPaid(row), disabled: loading.value }, {
      icon: () => h(NIcon, null, { default: () => h(CashOutline) }),
      default: () => h('span', { class: 'label-text' }, 'Marcar como pagada')
    });
    return h(NTooltip, { placement: 'top' }, { trigger: () => btn, default: () => 'Marcar como pagada' });
  }
  if (st === 'paid') {
    const btn = h(NButton, { size: 'small', tertiary: true, onClick: () => markFulfilled(row), disabled: loading.value }, {
      icon: () => h(NIcon, null, { default: () => h(CheckmarkDoneOutline) }),
      default: () => h('span', { class: 'label-text' }, 'Marcar como completada')
    });
    return h(NTooltip, { placement: 'top' }, { trigger: () => btn, default: () => 'Marcar como completada' });
  }
  return h('span', { style: 'color: #888' }, 'Sin acciones');
}

async function markPaid(row: Row) {
  try {
    await staffApi.markOrderPaid(row.id);
    await refresh();
    msg.success('Orden marcada como pagada');
  } catch (err: any) {
    console.error(err);
    msg.error('No se pudo marcar como pagada');
  }
}

async function markFulfilled(row: Row) {
  try {
    await staffApi.setOrderFulfillment(row.id, true);
    await refresh();
    msg.success('Orden marcada como completada');
  } catch (err: any) {
    console.error(err);
    msg.error('No se pudo marcar como completada');
  }
}

function openDetails(row: Row) {
  selected.value = row;
  detailsOpen.value = true;
}
function itemName(id: string): string {
  return itemsById.value[id]?.name || '(sin nombre)';
}
function fmtDateTime(iso?: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR');
  } catch {
    return String(iso);
  }
}

onMounted(() => { refresh(); });

// Auto refresh when changing the state filter
watch(state, () => {
  refresh();
});

// Preload item names once
onMounted(() => { loadItemsLookup(); });
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display: flex; gap: 8px; align-items: center; }
.grow { flex: 1; }
/* Make long customer names truncate nicely in narrow layouts */
.cell-ellipsis { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Card header with status at the top next to title */
.card-header-line { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.card-title { font-weight: 700; font-size: 18px; letter-spacing: .2px; }
/* Details metadata row: allow wrapping so long names don't break layout */
.meta-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
.meta-row > * { min-width: 0; }
.flex-spacer { flex: 1 1 auto; min-width: 0; }
/* Customer highlight: looks like text, subtly emphasized (not like a label/tag) */
.customer-highlight { display:inline; padding:2px 6px; border-radius:6px; background: rgba(32,128,240,.08); color:#1f2d3d; line-height: 1.4; }
.customer-highlight .label { color:#1a59b7; font-weight: 700; }
.customer-highlight .name { font-weight: 700; word-break: break-word; }

/* Ultra-compact two-line row layout for very narrow screens (~500px) */
/* New grid layout for ≤500px to improve alignment and readability */
.two-line-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "left1 right1"
    "left2 right2";
  row-gap: 6px;
  column-gap: 8px;
  padding: 4px 0;
}
.g-left1 { grid-area: left1; min-width: 0; display: flex; align-items: center; gap: 6px; }
.g-right1 { grid-area: right1; display: flex; align-items: center; gap: 6px; justify-self: end; }
.g-left2 { grid-area: left2; display: flex; align-items: center; gap: 6px; }
.g-right2 { grid-area: right2; display: flex; align-items: center; gap: 6px; justify-self: end; font-size: 12px; color: #666; }
.g-left1 .code { font-weight: 700; }
.g-left1 .customer { min-width: 0; max-width: 54vw; }
.g-right1 .total { margin-right: 2px; }
/* Make icon-only buttons consistent and compact */
:deep(.n-button.n-button--quaternary),
:deep(.n-button.n-button--tertiary) {
  padding: 4px 6px;
}
/* Slight row divider feeling inside the cell */
.two-line-grid { border-bottom: 1px solid rgba(0,0,0,.05); }

/* =============================
   CSS-first responsive behavior
   ============================= */
/* Default (desktop/tablet): use the regular multi-column table, hide mobile composite column */
:deep(.n-data-table-th.col-mobile),
:deep(.n-data-table-td.col-mobile) {
  display: none;
}

/* Make button labels visible by default (desktop) */
.label-text { display: inline; }

/* Compact mode for medium screens (<900px): keep regular columns but make controls icon-first */
@media (max-width: 899px) {
  /* Hide text labels inside buttons to save space; keep icons */
  .label-text { display: none; }
  /* Slightly tighten tag appearance */
  .status-tag { font-size: 12px; }
}

/* Ultra-compact mode for small phones (≤500px): show only the composite column */
@media (max-width: 500px) {
  /* Show the mobile composite column */
  :deep(.n-data-table-th.col-mobile),
  :deep(.n-data-table-td.col-mobile) {
    display: table-cell;
  }
  /* Hide all standard columns */
  :deep(.n-data-table-th.col-details),
  :deep(.n-data-table-td.col-details),
  :deep(.n-data-table-th.col-code),
  :deep(.n-data-table-td.col-code),
  :deep(.n-data-table-th.col-customer),
  :deep(.n-data-table-td.col-customer),
  :deep(.n-data-table-th.col-items),
  :deep(.n-data-table-td.col-items),
  :deep(.n-data-table-th.col-total),
  :deep(.n-data-table-td.col-total),
  :deep(.n-data-table-th.col-status),
  :deep(.n-data-table-td.col-status),
  :deep(.n-data-table-th.col-action),
  :deep(.n-data-table-td.col-action) {
    display: none;
  }

  /* Make tags compact in mobile composite */
  .status-tag { font-size: 12px; }
}
</style>

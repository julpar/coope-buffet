<template>
  <div class="page">
    <h2>Estado de la plataforma</h2>
    <p class="muted">Control global para clientes. El modo apagado duro bloquea completamente el sitio de clientes; el modo pausa muestra un aviso y desactiva pedidos.</p>

    <n-card size="small" class="card">
      <div class="row">
        <label>Estado</label>
        <n-radio-group v-model:value="form.status" name="platform-status" :disabled="loading">
          <n-radio value="online">Online</n-radio>
          <n-radio value="soft-offline">Pausa (solo aviso)</n-radio>
          <n-radio value="hard-offline">Apagado (total)</n-radio>
        </n-radio-group>
      </div>

      <div class="row">
        <label>Mensaje para clientes</label>
        <n-input v-model:value="form.message" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="Ej. Cerrado por mantenimiento. Volvemos pronto." :disabled="loading" />
      </div>

      <div class="row">
        <label>Métodos de pago</label>
        <div class="pay-methods">
          <n-checkbox-group v-model:value="form.paymentMethods" :disabled="loading">
            <n-checkbox value="online" label="Online (Mercado Pago)" />
            <n-checkbox value="cash" label="Efectivo en Caja" />
          </n-checkbox-group>
          <div v-if="form.status==='online' && (form.paymentMethods?.length||0)===0" class="field-error">Seleccioná al menos un método de pago para el modo Online.</div>
        </div>
      </div>

      <div class="row">
        <label>Hasta (opcional)</label>
        <n-date-picker v-model:value="untilTs" type="datetime" clearable :disabled="loading" />
      </div>

      <div class="actions">
        <n-button type="primary" :loading="saving" @click="save">Guardar</n-button>
        <n-button quaternary :disabled="loading" @click="refresh">Actualizar</n-button>
      </div>

      <n-alert v-if="current" type="info" title="Estado actual" class="current">
        <div><strong>{{ label(current.status) }}</strong></div>
        <div v-if="current.message">Mensaje: {{ current.message }}</div>
        <div v-if="current.offlineUntil">Hasta: {{ formatTs(current.offlineUntil) }}</div>
        <div>Métodos de pago: {{ (current.paymentMethods||[]).map(pmLabel).join(', ') || '—' }}</div>
      </n-alert>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useMessage, NCard, NRadioGroup, NRadio, NInput, NDatePicker, NButton, NAlert, NCheckboxGroup, NCheckbox } from 'naive-ui';
import { platformApi, type PlatformStatus, type PlatformStatusResponse } from '../lib/api';

const msg = useMessage();

const loading = ref(false);
const saving = ref(false);
const current = ref<PlatformStatusResponse | null>(null);

const form = ref<{ status: PlatformStatus; message: string; offlineUntil: number | null; paymentMethods: Array<'online' | 'cash'> }>({
  status: 'online',
  message: '',
  offlineUntil: null,
  paymentMethods: ['online', 'cash'],
});
const untilTs = computed({
  get: () => form.value.offlineUntil || null,
  set: (v: number | null) => {
    form.value.offlineUntil = v && Number.isFinite(v) ? v : null;
  },
});

function label(s: PlatformStatus) {
  return s === 'online' ? 'Online' : s === 'soft-offline' ? 'Pausa (soft-offline)' : 'Apagado total (hard-offline)';
}

function pmLabel(m: 'online' | 'cash') {
  return m === 'online' ? 'Online (Mercado Pago)' : 'Efectivo en Caja';
}

function formatTs(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

async function refresh() {
  loading.value = true;
  try {
    const st = await platformApi.getStaffStatus();
    current.value = st;
    form.value = { status: st.status, message: st.message || '', offlineUntil: st.offlineUntil || null, paymentMethods: (st.paymentMethods && st.paymentMethods.length ? st.paymentMethods : ['online','cash']) };
  } catch (e: any) {
    msg.error('No se pudo cargar el estado');
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    if (form.value.status === 'online' && (!form.value.paymentMethods || form.value.paymentMethods.length === 0)) {
      msg.error('Seleccioná al menos un método de pago para el modo Online.');
      return;
    }
    const body = { status: form.value.status, message: (form.value.message || '').trim(), offlineUntil: form.value.offlineUntil ?? null, paymentMethods: form.value.paymentMethods };
    const res = await platformApi.setStatus(body);
    current.value = { status: res.status, message: res.message, offlineUntil: res.offlineUntil, paymentMethods: res.paymentMethods };
    msg.success('Estado actualizado');
  } catch (e: any) {
    try {
      const msgTxt = String(e?.message || '');
      if (msgTxt.includes('{') && msgTxt.includes('}')) {
        const start = msgTxt.indexOf('{');
        const end = msgTxt.lastIndexOf('}');
        if (end > start) {
          const json = JSON.parse(msgTxt.slice(start, end + 1));
          if (json && json.code === 'VALIDATION_ERROR') {
            msg.error(json.message || 'Error de validación');
            return;
          }
        }
      }
    } catch {}
    msg.error('No se pudo guardar');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  refresh();
});
</script>

<style scoped>
.page { padding: 16px; }
.muted { color: #666; margin-bottom: 12px; }
.card { max-width: 720px; }
.row { display: grid; grid-template-columns: 180px 1fr; gap: 12px; align-items: start; margin-bottom: 12px; }
.row > label { padding-top: 6px; font-weight: 600; }
.actions { display: flex; gap: 8px; margin-top: 8px; }
.current { margin-top: 16px; }
@media (max-width: 640px) {
  .row { grid-template-columns: 1fr; }
}
</style>

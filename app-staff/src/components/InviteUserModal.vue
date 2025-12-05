<template>
  <n-modal
    v-model:show="show"
    preset="card"
    :title="step === 'form' ? 'Nuevo acceso permanente' : 'Acceso creado'"
    :mask-closable="!creating"
    :closable="!creating"
  >
    <div
      v-if="step === 'form'"
      class="form"
    >
      <n-form @submit.prevent>
        <n-form-item label="Nombre del dispositivo/usuario">
          <n-input
            v-model:value="nickname"
            placeholder="Ej.: Cajera 1"
            @keyup.enter="tryCreate"
          />
        </n-form-item>
        <n-form-item label="Roles">
          <n-checkbox-group v-model:value="roles">
            <n-space wrap>
              <n-checkbox
                v-for="r in roleOptions"
                :key="r"
                :value="r"
              >
                {{ r }}
              </n-checkbox>
            </n-space>
          </n-checkbox-group>
        </n-form-item>
      </n-form>
      <div class="actions">
        <n-button
          quaternary
          :disabled="creating"
          @click="cancel"
        >
          Cancelar
        </n-button>
        <n-button
          type="primary"
          :loading="creating"
          :disabled="!nickname || roles.length === 0"
          @click="tryCreate"
        >
          Crear
        </n-button>
      </div>
    </div>

    <div
      v-else
      class="success"
    >
      <div class="hint">
        URL de acceso (válida para iniciar sesión permanente):
      </div>
      <n-input
        :value="permUrl"
        readonly
      />
      <div class="perm-actions">
        <n-button
          size="small"
          @click="copyPerm"
        >
          Copiar enlace
        </n-button>
        <n-button
          size="small"
          tertiary
          tag="a"
          :href="permUrl"
          target="_blank"
        >
          Abrir
        </n-button>
        <n-button
          v-if="canShare"
          size="small"
          @click="sharePerm"
        >
          Compartir
        </n-button>
      </div>
      <div class="qr-wrap">
        <img
          :src="qrSrc"
          alt="QR de acceso"
          class="qr"
        >
        <div class="qr-hint">
          Escanea con la cámara del dispositivo para iniciar sesión.
        </div>
      </div>
      <div class="actions">
        <n-button
          quaternary
          @click="close"
        >
          Cerrar
        </n-button>
        <n-button
          type="primary"
          @click="createAnother"
        >
          Crear otro
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useMessage, NModal, NForm, NFormItem, NInput, NButton, NCheckbox, NCheckboxGroup, NSpace } from 'naive-ui';
import { usersApi } from '../lib/api';
import { useQRCode } from '@vueuse/integrations/useQRCode';

const props = defineProps<{
  show: boolean;
}>();
const emit = defineEmits<{
  (e: 'update:show', v: boolean): void;
  (e: 'created', payload: { id: string; nickname: string; roles: string[]; permUrl: string }): void;
}>();

const show = ref(props.show);
watch(() => props.show, v => show.value = v);
watch(show, v => emit('update:show', v));

const message = useMessage();
const step = ref<'form' | 'success'>('form');
const nickname = ref('');
const roles = ref<string[]>([]);
const roleOptions = ['ADMIN', 'STOCK', 'CASHIER', 'ORDER_FULFILLER'];
const creating = ref(false);
const permUrl = ref('');
const qrData = ref('');
const qrSrc = useQRCode(qrData, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
const canShare = (typeof navigator !== 'undefined' && 'share' in navigator) as boolean;

watch(show, async (v) => {
  if (v) {
    // Reset state each time it opens
    step.value = 'form';
    permUrl.value = '';
    qrData.value = '';
    await nextTick();
  }
});

function cancel() {
  show.value = false;
}

async function tryCreate() {
  if (!nickname.value) return;
  if (roles.value.length === 0) {
    message.warning('Selecciona al menos un rol');
    return;
  }
  creating.value = true;
  try {
    const res = await usersApi.create(nickname.value, roles.value);
    permUrl.value = res.permUrl;
    qrData.value = permUrl.value;
    emit('created', { id: res.user.id, nickname: res.user.nickname, roles: res.user.roles, permUrl: res.permUrl });
    step.value = 'success';
    message.success('Usuario creado');
    // Clear fields so creating another starts fresh
    nickname.value = '';
    roles.value = [];
  } catch {
    message.error('No se pudo crear el usuario');
  } finally {
    creating.value = false;
  }
}

function copyPerm() {
  if (!permUrl.value) return;
  navigator.clipboard?.writeText(permUrl.value)
    .then(() => message.success('Enlace copiado'))
    .catch(() => message.warning('No se pudo copiar'));
}

async function sharePerm() {
  try {
    if (!permUrl.value) return;
    // @ts-ignore
    if (navigator.share) {
      // @ts-ignore
      await navigator.share({ title: 'Acceso permanente', text: 'Escanea o abre este enlace para iniciar sesión', url: permUrl.value });
    } else {
      copyPerm();
    }
  } catch {
    // ignore
  }
}

function close() {
  show.value = false;
}

function createAnother() {
  step.value = 'form';
  permUrl.value = '';
  qrData.value = '';
}
</script>

<style scoped>
.form { display:flex; flex-direction:column; gap: 8px; }
.actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 8px; }
.success { display:flex; flex-direction:column; gap:10px; }
.hint { font-size:12px; color:#666; }
.perm-actions { display:flex; gap:8px; align-items:center; }
.qr-wrap { display:flex; flex-direction:column; align-items:flex-start; gap:6px; margin-top: 4px; }
.qr { width: 320px; height: 320px; border:1px solid #eee; border-radius:8px; background:#fff; }
.qr-hint { font-size: 12px; color:#666; }
@media (max-width: 480px) {
  .qr { width: 240px; height: 240px; }
}
</style>

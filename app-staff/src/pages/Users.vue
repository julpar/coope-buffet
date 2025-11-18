<template>
  <div class="page">
    <div class="toolbar">
      <n-input v-model:value="q" placeholder="Buscar usuario..." clearable class="grow">
        <template #prefix>
          <n-icon size="16"><SearchOutline /></n-icon>
        </template>
      </n-input>
      <n-button type="primary" tertiary @click="showCreate = true">
        <template #icon><n-icon><PersonAddOutline /></n-icon></template>
        Invitar
      </n-button>
    </div>

    <n-data-table :columns="columns" :data="filtered" :bordered="true" />

    <n-modal v-model:show="showCreate" preset="card" title="Nuevo acceso permanente">
      <div class="form">
        <n-input v-model:value="nickname" placeholder="Nombre (ej. Cajera 1)" />
        <div class="roles">
          <label v-for="r in roleOptions" :key="r" class="role">
            <input type="checkbox" :value="r" v-model="roles" /> {{ r }}
          </label>
        </div>
        <div class="actions">
          <n-button quaternary @click="showCreate = false">Cancelar</n-button>
          <n-button type="primary" :loading="creating" :disabled="!nickname" @click="createUser">Crear</n-button>
        </div>
        <div v-if="permUrl" class="perm">
          <div class="perm-title">URL de acceso (escanea o comparte para iniciar sesión):</div>
          <n-input :value="permUrl" readonly />
          <div class="perm-actions">
            <n-button size="small" @click="copyPerm">Copiar enlace</n-button>
            <n-button size="small" tertiary tag="a" :href="permUrl" target="_blank">Abrir</n-button>
            <n-button v-if="canShare" size="small" @click="sharePerm">Compartir</n-button>
          </div>
          <div class="qr-wrap">
            <img :src="qrSrc" alt="QR de acceso" class="qr" />
            <div class="qr-hint">Escanea con la cámara del dispositivo para iniciar sesión.</div>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
  
</template>

<script setup lang="ts">
import { h, computed, ref, onMounted, watch } from 'vue';
import { NTag, NButton, useMessage, type DataTableColumns } from 'naive-ui';
import { PersonAddOutline, CreateOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5';
import { usersApi, type StaffUser } from '../lib/api';

const q = ref('');
const rows = ref<StaffUser[]>([]);
const filtered = computed(() => rows.value.filter(r => !q.value || r.nickname.toLowerCase().includes(q.value.toLowerCase())));
const message = useMessage();

async function loadUsers() {
  try {
    rows.value = await usersApi.list();
  } catch (e) {
    message.error('No se pudieron cargar los usuarios');
  }
}

const columns: DataTableColumns<StaffUser> = [
  { title: 'Nombre', key: 'nickname' },
  { title: 'Roles', key: 'roles', width: 260, render: (row: StaffUser) => h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' }, row.roles.map(r => h(NTag, { size: 'small' }, { default: () => r }))) },
  { title: 'ID', key: 'id', width: 160 },
  { title: 'Acciones', key: 'actions', width: 200, render: (row: StaffUser) => h('div', { style: 'display:flex; gap:8px' }, [
      h(NButton, { quaternary: true, size: 'small', type: 'error', onClick: () => removeUser(row) }, { default: () => 'Eliminar', icon: () => h('i', { class: 'n-icon' }, h(TrashOutline)) })
    ])
  }
];

onMounted(loadUsers);

// create modal state
const showCreate = ref(false);
const nickname = ref('');
const roles = ref<string[]>([]);
const roleOptions = ['ADMIN', 'STOCK', 'CASHIER', 'ORDER_FULFILLER'];
const creating = ref(false);
const permUrl = ref('');
const qrSrc = ref('');
const canShare = (typeof navigator !== 'undefined' && 'share' in navigator) as boolean;

async function createUser() {
  creating.value = true;
  try {
    const res = await usersApi.create(nickname.value, roles.value);
    permUrl.value = res.permUrl;
    // Generate QR via lightweight remote generator (no extra deps). If you prefer fully offline, replace with a local QR util.
    qrSrc.value = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(permUrl.value)}`;
    nickname.value = '';
    roles.value = [];
    await loadUsers();
    message.success('Usuario creado');
  } catch (e) {
    message.error('No se pudo crear el usuario');
  } finally {
    creating.value = false;
  }
}

function copyPerm() {
  if (!permUrl.value) return;
  navigator.clipboard?.writeText(permUrl.value).then(() => message.success('Enlace copiado')).catch(() => message.warning('No se pudo copiar'));
}

async function sharePerm() {
  try {
    if (!permUrl.value) return;
    // Try Web Share API
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

async function removeUser(u: StaffUser) {
  if (!confirm(`Eliminar usuario ${u.nickname}?`)) return;
  try {
    await usersApi.remove(u.id);
    await loadUsers();
    message.success('Usuario eliminado');
  } catch {
    message.error('No se pudo eliminar');
  }
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display:flex; align-items:center; gap:8px; }
.grow { flex: 1; }
.form { display:flex; flex-direction:column; gap:12px; }
.actions { display:flex; justify-content:flex-end; gap:8px; }
.roles { display:flex; flex-wrap:wrap; gap:8px; }
.role { display:flex; align-items:center; gap:6px; font-size: 13px; }
.perm { display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.perm-title { font-size: 12px; color:#666; }
.perm-actions { display:flex; gap:8px; align-items:center; }
.qr-wrap { display:flex; flex-direction:column; align-items:flex-start; gap:6px; margin-top:8px; }
.qr { width: 240px; height: 240px; border: 1px solid #eee; border-radius: 6px; background: #fff; }
.qr-hint { font-size: 12px; color:#666; }
</style>

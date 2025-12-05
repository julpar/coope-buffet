<template>
  <div class="page">
    <div class="toolbar">
      <n-input
        v-model:value="q"
        placeholder="Buscar usuario..."
        clearable
        class="grow"
      >
        <template #prefix>
          <n-icon size="16">
            <SearchOutline />
          </n-icon>
        </template>
      </n-input>
      <n-button
        type="primary"
        tertiary
        @click="showCreate = true"
      >
        <template #icon>
          <n-icon><PersonAddOutline /></n-icon>
        </template>
        Invitar
      </n-button>
    </div>

    <div class="table-wrap">
      <n-data-table
        :columns="columns"
        :data="filtered"
        :bordered="true"
        :scroll-x="880"
      />
    </div>

    <InviteUserModal
      v-model:show="showCreate"
      @created="onCreated"
    />
    <EditUserModal
      v-model:show="showEdit"
      :user="editingUser"
      @saved="onSaved"
    />

    <n-modal
      v-model:show="showQR"
      preset="card"
      title="Acceso permanente"
      :mask-closable="!loadingQR"
      :closable="!loadingQR"
    >
      <div v-if="loadingQR">
        Cargando…
      </div>
      <div
        v-else
        class="qr-modal"
      >
        <div class="hint">
          URL de acceso:
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
        </div>
        <div
          v-if="qrSrc"
          class="qr-wrap"
        >
          <img
            :src="qrSrc"
            alt="QR de acceso"
            class="qr"
          >
          <div class="qr-hint">
            Escanea con la cámara del dispositivo para iniciar sesión.
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, computed, ref, onMounted, type VNode } from 'vue';
import { NTag, NButton, useMessage, type DataTableColumns } from 'naive-ui';
import { PersonAddOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5';
import { usersApi, authApi, type StaffUser } from '../lib/api';
import InviteUserModal from '../components/InviteUserModal.vue';
import EditUserModal from '../components/EditUserModal.vue';
import { useQRCode } from '@vueuse/integrations/useQRCode';

const q = ref('');
const rows = ref<StaffUser[]>([]);
const filtered = computed(() => rows.value.filter(r => !q.value || r.nickname.toLowerCase().includes(q.value.toLowerCase())));
const message = useMessage();
const roles = ref<string[]>([]);
const isAdmin = computed(() => roles.value.includes('ADMIN'));

async function loadUsers() {
  try {
    rows.value = await usersApi.list();
  } catch {
    message.error('No se pudieron cargar los usuarios');
  }
}

async function loadAuth() {
  try {
    const st = await authApi.status({ force: true });
    roles.value = st.currentUser?.roles || [];
  } catch {
    roles.value = [];
  }
}

const columns: DataTableColumns<StaffUser> = [
  { title: 'Nombre', key: 'nickname', minWidth: 200, ellipsis: true },
  { title: 'Roles', key: 'roles', minWidth: 240, render: (row: StaffUser) => h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px' }, row.roles.map(r => h(NTag, { size: 'small' }, { default: () => r }))) },
  { title: 'ID', key: 'id', width: 160 },
  { title: 'Acciones', key: 'actions', width: 300, render: (row: StaffUser) => h('div', { style: 'display:flex; gap:8px; white-space: nowrap;' }, (
      [
        isAdmin.value ? h(NButton, { quaternary: true, size: 'small', onClick: () => viewQR(row) }, { default: () => 'Ver QR' }) : null,
        h(NButton, { quaternary: true, size: 'small', onClick: () => editUser(row) }, { default: () => 'Editar' }),
        h(NButton, { quaternary: true, size: 'small', type: 'error', onClick: () => removeUser(row) }, { default: () => 'Eliminar', icon: () => h('i', { class: 'n-icon' }, h(TrashOutline)) })
      ] as Array<VNode | null>
    ).filter((n): n is VNode => n !== null))
  }
];

onMounted(async () => { await Promise.all([loadUsers(), loadAuth()]); });

// create modal state
const showCreate = ref(false);
async function onCreated() {
  await loadUsers();
}

// edit modal state
const showEdit = ref(false);
const editingUser = ref<StaffUser | null>(null);
function editUser(u: StaffUser) {
  editingUser.value = u;
  showEdit.value = true;
}
async function onSaved() {
  // Reload list so tags reflect changes
  await loadUsers();
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

// QR modal state/actions
const showQR = ref(false);
const loadingQR = ref(false);
const permUrl = ref('');
const qrData = ref('');
const qrSrc = useQRCode(qrData, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
async function viewQR(u: StaffUser) {
  if (!isAdmin.value) return;
  showQR.value = true;
  loadingQR.value = true;
  permUrl.value = '';
  qrData.value = '';
  try {
    const res = await usersApi.getPermUrl(u.id);
    permUrl.value = res.permUrl;
    qrData.value = permUrl.value;
  } catch {
    message.error('No se pudo obtener el QR');
    showQR.value = false;
  } finally {
    loadingQR.value = false;
  }
}

function copyPerm() {
  if (!permUrl.value) return;
  navigator.clipboard?.writeText(permUrl.value)
    .then(() => message.success('Enlace copiado'))
    .catch(() => message.warning('No se pudo copiar'));
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display:flex; align-items:center; gap:8px; }
.grow { flex: 1; }
.table-wrap { overflow-x: auto; }
/* Keep table headers in one line on small screens to avoid vertical letter stacking */
:deep(.n-data-table-th) { white-space: nowrap; }
.qr-modal { display:flex; flex-direction:column; gap:10px; }
.hint { font-size:12px; color:#666; }
.perm-actions { display:flex; gap:8px; align-items:center; }
.qr-wrap { display:flex; flex-direction:column; align-items:flex-start; gap:6px; margin-top: 4px; }
.qr { width: 320px; height: 320px; border:1px solid #eee; border-radius:8px; background:#fff; }
@media (max-width: 480px) {
  .qr { width: 240px; height: 240px; }
}
</style>

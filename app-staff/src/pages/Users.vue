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

    <InviteUserModal v-model:show="showCreate" @created="onCreated" />
    <EditUserModal v-model:show="showEdit" :user="editingUser" @saved="onSaved" />
  </div>
  
</template>

<script setup lang="ts">
import { h, computed, ref, onMounted } from 'vue';
import { NTag, NButton, useMessage, type DataTableColumns } from 'naive-ui';
import { PersonAddOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5';
import { usersApi, type StaffUser } from '../lib/api';
import InviteUserModal from '../components/InviteUserModal.vue';
import EditUserModal from '../components/EditUserModal.vue';

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
  { title: 'Acciones', key: 'actions', width: 260, render: (row: StaffUser) => h('div', { style: 'display:flex; gap:8px' }, [
      h(NButton, { quaternary: true, size: 'small', onClick: () => editUser(row) }, { default: () => 'Editar' }),
      h(NButton, { quaternary: true, size: 'small', type: 'error', onClick: () => removeUser(row) }, { default: () => 'Eliminar', icon: () => h('i', { class: 'n-icon' }, h(TrashOutline)) })
    ])
  }
];

onMounted(loadUsers);

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
async function onSaved(_u: StaffUser) {
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
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { display:flex; align-items:center; gap:8px; }
.grow { flex: 1; }
</style>

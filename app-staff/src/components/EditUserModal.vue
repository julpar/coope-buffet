<template>
  <n-drawer
    v-model:show="show"
    :width="360"
    placement="right"
  >
    <n-drawer-content :title="`Editar usuario: ${original?.nickname ?? ''}`">
      <n-form @submit.prevent>
        <n-form-item label="Nombre (opcional)">
          <n-input
            v-model:value="nickname"
            placeholder="Nombre para mostrar"
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
          :disabled="saving"
          @click="close"
        >
          Cancelar
        </n-button>
        <n-button
          type="primary"
          :loading="saving"
          :disabled="roles.length === 0"
          @click="save"
        >
          Guardar
        </n-button>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMessage, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NCheckbox, NCheckboxGroup, NSpace, NButton } from 'naive-ui';
import { usersApi, type StaffUser } from '../lib/api';

const props = defineProps<{
  show: boolean;
  user: StaffUser | null;
}>();
const emit = defineEmits<{
  (e: 'update:show', v: boolean): void;
  (e: 'saved', user: StaffUser): void;
}>();

const show = ref(props.show);
watch(() => props.show, v => show.value = v);
watch(show, v => emit('update:show', v));

const original = ref<StaffUser | null>(props.user ?? null);
watch(() => props.user, (u) => { original.value = u ?? null; resetFromOriginal(); });

const roleOptions = ['ADMIN', 'STOCK', 'CASHIER', 'ORDER_FULFILLER'];
const nickname = ref<string>('');
const roles = ref<string[]>([]);
const saving = ref(false);
const message = useMessage();

function resetFromOriginal() {
  nickname.value = original.value?.nickname ?? '';
  roles.value = [...(original.value?.roles ?? [])];
}

watch(show, (v) => { if (v) resetFromOriginal(); });

function close() {
  show.value = false;
}

async function save() {
  if (!original.value) return;
  if (roles.value.length === 0) {
    message.warning('Selecciona al menos un rol');
    return;
  }
  saving.value = true;
  try {
    const updated = await usersApi.update(original.value.id, {
      nickname: nickname.value?.trim() || original.value.nickname,
      roles: roles.value as string[],
    });
    message.success('Usuario actualizado');
    emit('saved', updated);
    show.value = false;
  } catch {
    message.error('No se pudo actualizar');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 8px; }
</style>

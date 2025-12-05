<template>
  <div class="login">
    <n-card title="Iniciar sesión (Staff)">
      <p class="lead">
        Para usar el panel del staff necesitas una sesión activa.
      </p>
      <ul class="hints">
        <li>
          Si eres <strong>ADMIN</strong> y es tu primer acceso en este dispositivo, ve a <em>Usuarios</em> desde un dispositivo ya autenticado y genera un <strong>acceso permanente</strong> para este equipo. Escanea el QR o abre el enlace resultante aquí.
        </li>
        <li>
          <strong>STOCK / CAJERO / FULFILLER</strong>: pídele al ADMIN que te comparta o escanee tu QR de acceso. El QR abrirá la ruta segura que inicia sesión automáticamente.
        </li>
      </ul>

      <div class="or">
        — También puedes pegar manualmente tu token —
      </div>
      <form
        class="row"
        @submit.prevent="loginWithToken"
      >
        <n-input
          v-model:value="token"
          :type="showToken ? 'text' : 'password'"
          placeholder="Token permanente (xyz...)"
          @keyup.enter="loginWithToken"
        >
          <template #suffix>
            <n-button
              quaternary
              circle
              size="small"
              :title="showToken ? 'Ocultar' : 'Mostrar'"
              @click.prevent="toggleShowToken"
            >
              <n-icon size="18">
                <component :is="showToken ? EyeOffOutline : EyeOutline" />
              </n-icon>
            </n-button>
          </template>
        </n-input>
        <n-button
          type="primary"
          :loading="submitting"
          :disabled="!token"
          attr-type="submit"
        >
          Iniciar
        </n-button>
      </form>
      <p
        v-if="error"
        class="error"
      >
        {{ error }}
      </p>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NIcon } from 'naive-ui';
import { EyeOutline, EyeOffOutline } from '@vicons/ionicons5';
import { useRouter } from 'vue-router';
import { authApi } from '../lib/api';

const router = useRouter();
const token = ref('');
const submitting = ref(false);
const error = ref('');
const showToken = ref(false);

async function loginWithToken() {
  error.value = '';
  submitting.value = true;
  try {
    await authApi.perm(token.value.trim());
    router.replace('/');
  } catch {
    error.value = 'Token inválido o expirado.';
  } finally {
    submitting.value = false;
  }
}

function toggleShowToken() {
  showToken.value = !showToken.value;
}
</script>

<style scoped>
.login { display:flex; align-items:center; justify-content:center; padding: 40px 16px; }
.lead { margin: 0 0 12px; color:#333; }
.hints { margin:0 0 16px 18px; padding:0; color:#555; }
.hints li { margin-bottom: 6px; }
.or { text-align:center; color:#666; margin: 12px 0; font-size: 12px; }
.row { display:flex; gap:8px; }
.error { color:#b42318; margin-top: 10px; }
</style>

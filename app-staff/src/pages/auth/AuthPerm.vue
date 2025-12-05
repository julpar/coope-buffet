<template>
  <div class="auth-perm">
    <n-card title="Iniciando sesión…">
      <div
        v-if="state === 'loading'"
        class="msg"
      >
        Verificando token y creando sesión segura…
      </div>
      <div
        v-else-if="state === 'ok'"
        class="msg"
      >
        Listo. Redirigiendo…
      </div>
      <div
        v-else
        class="error"
      >
        <p>No se pudo iniciar sesión con este enlace.</p>
        <p class="hint">
          El token puede haber expirado o ser inválido. Pide un QR nuevo al ADMIN.
        </p>
        <n-button
          type="primary"
          @click="goLogin"
        >
          Ir a iniciar sesión
        </n-button>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { authApi } from '../../lib/api';

const router = useRouter();
const route = useRoute();
const state = ref<'loading' | 'ok' | 'err'>('loading');

function goLogin() {
  router.replace('/login');
}

onMounted(async () => {
  try {
    const tok = (route.query.token as string) || (route.query.fixef as string) || '';
    if (!tok) throw new Error('missing');
    await authApi.perm(tok);
    state.value = 'ok';
    setTimeout(() => router.replace('/'), 300);
  } catch (e) {
    state.value = 'err';
  }
});
</script>

<style scoped>
.auth-perm { display:flex; align-items:center; justify-content:center; padding:40px 16px; }
.msg { color:#333; }
.error { display:flex; flex-direction:column; gap:8px; color:#b42318; }
.hint { color:#555; margin:0; }
</style>

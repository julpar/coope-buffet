<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-layout class="layout">
      <n-layout-header v-if="ready && (adminExists && currentUser)" bordered class="header">
        <div class="brand">
          <n-icon size="22"><StorefrontOutline /></n-icon>
          <span>Buffet · Staff</span>
        </div>
        <div class="header-actions">
          <n-button tertiary type="primary">
            <template #icon>
              <n-icon><NotificationsOutline /></n-icon>
            </template>
            Notifications
          </n-button>
          <n-button text>
            <template #icon>
              <n-icon><PersonOutline /></n-icon>
            </template>
            {{ currentUser?.nickname || 'Perfil' }}
          </n-button>
        </div>
      </n-layout-header>

      <!-- Prominent banner when running in mocked mode -->
      <div v-if="ready && isMocked && !bannerDismissed" class="mock-banner" role="alert">
        <div class="mock-banner__content">
          <div class="mock-banner__text">
            <strong>Mock mode activo.</strong>
            <span>
              Usando datos locales porque la API no está disponible.
              <small class="muted">Destino configurado: {{ apiBase }}</small>
            </span>
          </div>
          <div class="mock-banner__actions">
            <n-button size="small" tertiary @click="dismissBanner">Ocultar por esta sesión</n-button>
          </div>
        </div>
      </div>

      <!-- First-time setup: create admin -->
      <div v-if="ready && !adminExists" class="setup">
        <div class="setup-card">
          <h2>Configuración inicial</h2>
          <p>Crea el usuario administrador para empezar.</p>
          <n-input v-model:value="adminNickname" placeholder="Nombre para Admin (ej. Dire)" />
          <n-input type="password" v-model:value="adminPassword" placeholder="Contraseña/TOKEN para Admin (mínimo 6 caracteres)" />
          <n-button type="primary" :loading="savingAdmin" :disabled="!canCreateAdmin" @click="createAdmin">Crear administrador</n-button>
          <p class="hint">La contraseña definida funcionará como <strong>token permanente</strong> para iniciar sesión en este dispositivo (o por QR). Puedes cambiarla recreando el usuario más adelante.</p>
        </div>
      </div>
      <!-- If admin exists but no session yet, show the routed auth pages (e.g., /login) without sidebar/header -->
      <div v-else-if="ready && adminExists && !currentUser" class="auth-only">
        <RouterView />
      </div>

      <!-- Full app layout once authenticated -->
      <n-layout v-else has-sider>
        <n-layout-sider :collapsed="collapsed" show-trigger bordered collapse-mode="width" :collapsed-width="64" width="220">
          <n-menu :value="$route.path" :options="menuOptions" @update:value="onMenu" :collapsed="collapsed" />
          <div class="aside-footer">
            <div class="aside-toggle">
              <span>{{ collapsed ? 'Compact' : 'Expanded' }}</span>
              <n-switch v-model:value="collapsed" size="small" />
            </div>
          </div>
        </n-layout-sider>
        <n-layout-content class="main">
          <RouterView />
        </n-layout-content>
      </n-layout>
    </n-layout>
  </n-config-provider>
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, type GlobalThemeOverrides } from 'naive-ui';
import {
  StorefrontOutline,
  BarChartOutline,
  ListOutline,
  CubeOutline,
  RestaurantOutline,
  PersonOutline,
  NotificationsOutline
} from '@vicons/ionicons5';
import { isMocked as apiIsMocked, API_BASE, authApi, type StaffUser } from './lib/api';

const router = useRouter();
const collapsed = ref(false);

const renderIcon = (icon: any) => () => h(NIcon, null, { default: () => h(icon) });

const menuOptions = [
  { label: 'Dashboard', key: '/', icon: renderIcon(BarChartOutline) },
  { label: 'Órdenes', key: '/orders', icon: renderIcon(ListOutline) },
  { label: 'Inventario', key: '/inventory', icon: renderIcon(CubeOutline) },
  { label: 'Menú', key: '/menu', icon: renderIcon(RestaurantOutline) },
  { label: 'Usuarios', key: '/users', icon: renderIcon(PersonOutline) },
];

const onMenu = (path: string) => {
  if (path !== router.currentRoute.value.path) router.push(path);
};

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0d47a1',
    primaryColorHover: '#1256c7',
    primaryColorPressed: '#0a3a80'
  }
};

// Mock banner state
const apiBase = API_BASE;
const isMocked = apiIsMocked;
const bannerDismissed = ref(sessionStorage.getItem('hide-mock-banner') === '1');
function dismissBanner() {
  bannerDismissed.value = true;
  sessionStorage.setItem('hide-mock-banner', '1');
}

// Auth bootstrap
const ready = ref(false);
const adminExists = ref<boolean>(true);
const currentUser = ref<StaffUser | null>(null);
const adminNickname = ref('');
const adminPassword = ref('');
const savingAdmin = ref(false);
const canCreateAdmin = computed(() => !!adminNickname.value && (adminPassword.value?.length || 0) >= 6);

async function loadAuth() {
  try {
    const st = await authApi.status();
    adminExists.value = st.adminExists;
    currentUser.value = st.currentUser;
  } catch {
    // If API unavailable, leave defaults
  } finally {
    ready.value = true;
  }
}

async function createAdmin() {
  if (!canCreateAdmin.value) return;
  savingAdmin.value = true;
  try {
    await authApi.initAdmin(adminNickname.value, adminPassword.value);
    await loadAuth();
  } catch (e) {
    // eslint-disable-next-line no-alert
    alert('Error creando admin: ' + (e as any)?.message);
  } finally {
    savingAdmin.value = false;
  }
}

// Handle permanent token via URL param (?token=...)
async function handlePermFromUrl() {
  try {
    const usp = new URLSearchParams(location.search);
    // Prefer `token`, keep `fixef` as backward-compatible alias for a short period
    const tok = usp.get('token') || usp.get('fixef');
    if (!tok) return;
    // Call backend to set the session cookie via AJAX
    await authApi.perm(tok);
    // Clean the URL (remove token/fixef parameter) without reloading
    usp.delete('token');
    usp.delete('fixef');
    const clean = location.pathname + (usp.toString() ? '?' + usp.toString() : '') + location.hash;
    history.replaceState({}, document.title, clean);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Permanent token login failed', e);
    // Clean the URL even on failure
    const usp = new URLSearchParams(location.search);
    let changed = false;
    if (usp.has('token')) { usp.delete('token'); changed = true; }
    if (usp.has('fixef')) { usp.delete('fixef'); changed = true; }
    if (changed) {
      const clean = location.pathname + (usp.toString() ? '?' + usp.toString() : '') + location.hash;
      history.replaceState({}, document.title, clean);
    }
  }
}

onMounted(async () => {
  await handlePermFromUrl();
  await loadAuth();
});

// Refresh auth status on route changes so header/layout reacts after QR login
watch(() => router.currentRoute.value.fullPath, async () => {
  await loadAuth();
});
</script>

<style scoped>
.layout { min-height: 100vh; }
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0,0,0,.08);
  backdrop-filter: saturate(180%) blur(8px);
}
.brand { display:flex; gap:10px; align-items:center; font-weight:600; }
.aside-footer { margin-top: auto; padding: 12px; border-top: 1px solid rgba(0,0,0,.08); }
.aside-toggle { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12px; }
.main { padding: 16px; background: #f6f7f9; }

.mock-banner {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff3cd; /* warning background */
  border-bottom: 1px solid #ffe69c;
}
.mock-banner__content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.mock-banner__text { display:flex; flex-direction: column; gap: 2px; color: #7a5d00; }
.mock-banner__text strong { color: #664d03; }
.mock-banner__text .muted { color: #8d6e00; margin-left: 8px; }
.mock-banner__actions { flex: 0 0 auto; }

.setup { display:flex; align-items:center; justify-content:center; padding: 40px 16px; }
.setup-card { background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:12px; padding:20px; max-width:480px; width:100%; display:flex; gap:12px; flex-direction:column; }
.setup-card h2 { margin:0 0 4px; }
.setup-card .hint { font-size:12px; color:#666; margin:0; }
</style>

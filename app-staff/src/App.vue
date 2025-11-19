<template>
  <n-message-provider>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-layout class="layout">
      <n-layout-header v-if="ready && (adminExists && currentUser)" bordered class="header">
        <div class="brand">
          <!-- Mobile menu trigger -->
          <n-button class="only-mobile" quaternary circle @click="drawerOpen = true" aria-label="Abrir menú">
            <template #icon>
              <n-icon><MenuOutline /></n-icon>
            </template>
          </n-button>
          <n-icon size="22"><StorefrontOutline /></n-icon>
          <span>Buffet · Staff</span>
        </div>
        <div class="header-actions">
          <div class="api-indicator" :title="`API: ${apiBase}`">
            <span class="dot" :class="apiStatusClass"></span>
            <span class="api-text">{{ apiLabel }}</span>
          </div>
          <!-- Notifications removed: no visible use -->

          <!-- Profile: full on desktop, icon-only on mobile -->
          <n-button class="hide-on-mobile" text>
            <template #icon>
              <n-icon><PersonOutline /></n-icon>
            </template>
            {{ currentUser?.nickname || 'Perfil' }}
          </n-button>
          <n-button class="only-mobile" quaternary circle aria-label="Perfil">
            <template #icon>
              <n-icon><PersonOutline /></n-icon>
            </template>
          </n-button>

          <!-- Logout -->
          <n-button class="hide-on-mobile" type="default" strong :loading="loggingOut" @click="onLogout">
            Salir
          </n-button>
          <n-button class="only-mobile" quaternary circle :loading="loggingOut" aria-label="Salir" @click="onLogout">
            <template #icon>
              <n-icon><PersonOutline /></n-icon>
            </template>
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

      <!-- Operational status banner for non-admin roles (soft/hard offline) -->
      <div v-if="ready && showPlatformBanner" class="platform-banner" :class="platformBannerClass" role="alert">
        <div class="platform-banner__content">
          <div class="platform-banner__text">
            <strong v-if="platformStatus?.status==='hard-offline'">Clientes: servicio no disponible</strong>
            <strong v-else>Clientes: pausa temporal</strong>
            <span>
              {{ platformStatus?.message || (platformStatus?.status==='hard-offline' ? 'El sitio de clientes está temporalmente apagado.' : 'Los clientes no pueden realizar pedidos por el momento.') }}
              <small v-if="platformStatus?.offlineUntil" class="muted">Hasta: {{ new Date(platformStatus!.offlineUntil!).toLocaleString() }}</small>
            </span>
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
        <!-- Desktop/tablet: keep sider; Mobile: hide sider and use drawer -->
        <n-layout-sider v-if="!isMobile" :collapsed="collapsed" show-trigger bordered collapse-mode="width" :collapsed-width="64" width="220">
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

        <!-- Mobile drawer menu -->
        <n-drawer v-model:show="drawerOpen" placement="left" :width="260">
          <n-drawer-content title="Menú">
            <n-menu :value="$route.path" :options="menuOptions" @update:value="onMenu" />
          </n-drawer-content>
        </n-drawer>
      </n-layout>
    </n-layout>
  </n-config-provider>
  </n-message-provider>
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, type GlobalThemeOverrides } from 'naive-ui';
import {
  StorefrontOutline,
  MenuOutline,
  BarChartOutline,
  ListOutline,
  RestaurantOutline,
  PersonOutline,
  CashOutline,
  CheckmarkDoneOutline,
  PowerOutline
} from '@vicons/ionicons5';
import { isMocked as apiIsMocked, API_BASE, apiOnline, authApi, type StaffUser, platformApi, type PlatformStatusResponse } from './lib/api';

const router = useRouter();
const collapsed = ref(false);
const drawerOpen = ref(false);
const isMobile = ref(false);

const renderIcon = (icon: any) => () => h(NIcon, null, { default: () => h(icon) });

const menuOptions = computed(() => {
  const roles = currentUser.value?.roles || [];
  const isAdmin = roles.includes('ADMIN');

  // Base: everyone sees Dashboard
  const opts: any[] = [
    { label: 'Dashboard', key: '/', icon: renderIcon(BarChartOutline) },
  ];

  if (isAdmin) {
    // Admin sees everything by default
    opts.push({ label: 'Órdenes', key: '/orders', icon: renderIcon(ListOutline) });
    opts.push({ label: 'Cajero', key: '/cashier', icon: renderIcon(CashOutline) });
    opts.push({ label: 'Fulfillment', key: '/fulfillment', icon: renderIcon(CheckmarkDoneOutline) });
    opts.push({ label: 'Menú', key: '/menu', icon: renderIcon(RestaurantOutline) });
    opts.push({ label: 'Usuarios', key: '/users', icon: renderIcon(PersonOutline) });
    opts.push({ label: 'Estado plataforma', key: '/platform', icon: renderIcon(PowerOutline) });
    return opts;
  }

  // Non-admin roles are limited: only their workstation + Dashboard
  if (roles.includes('CASHIER')) {
    opts.push({ label: 'Cajero', key: '/cashier', icon: renderIcon(CashOutline) });
  }
  if (roles.includes('ORDER_FULFILLER')) {
    opts.push({ label: 'Fulfillment', key: '/fulfillment', icon: renderIcon(CheckmarkDoneOutline) });
  }
  // Inventory editing is allowed for STOCK role
  if (roles.includes('STOCK')) {
    opts.push({ label: 'Menú', key: '/menu', icon: renderIcon(RestaurantOutline) });
  }

  // Do not expose other modules (Órdenes, Menú, Usuarios) for non-admin users.
  return opts;
});

const onMenu = (path: string) => {
  if (path !== router.currentRoute.value.path) router.push(path);
  // Close drawer on mobile navigation
  if (isMobile.value) drawerOpen.value = false;
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

// API status label and class for visual verification of server hits
const apiLabel = computed(() => {
  if (apiOnline.value === null) return 'API?';
  return apiOnline.value ? 'API online' : 'API offline';
});
const apiStatusClass = computed(() => {
  if (apiOnline.value === null) return 'unknown';
  return apiOnline.value ? 'online' : 'offline';
});

// Auth bootstrap
const ready = ref(false);
const adminExists = ref<boolean>(true);
const currentUser = ref<StaffUser | null>(null);
const adminNickname = ref('');
const adminPassword = ref('');
const savingAdmin = ref(false);
const canCreateAdmin = computed(() => !!adminNickname.value && (adminPassword.value?.length || 0) >= 6);
const loggingOut = ref(false);

// Platform status banner (visible to every logged-in user on soft/hard offline)
const platformStatus = ref<PlatformStatusResponse | null>(null);
const platformTimer = ref<number | null>(null);
const isAdminUser = computed(() => (currentUser.value?.roles || []).includes('ADMIN'));
const showPlatformBanner = computed(() => {
  // Only show once the app knows there's a logged-in user
  if (!currentUser.value) return false;
  if (!platformStatus.value) return false;
  // Show for both soft and hard offline
  return platformStatus.value.status === 'soft-offline' || platformStatus.value.status === 'hard-offline';
});
const platformBannerClass = computed(() => {
  const s = platformStatus.value?.status;
  return s === 'hard-offline' ? 'critical' : 'warning';
});
async function pollPlatformStatus() {
  try {
    const st = await platformApi.getPublicStatus();
    platformStatus.value = st;
  } catch {
    // ignore
  }
}
function startPlatformPolling() {
  // fetch immediately and then every 20s
  pollPlatformStatus();
  stopPlatformPolling();
  platformTimer.value = window.setInterval(pollPlatformStatus, 20000) as unknown as number;
}
function stopPlatformPolling() {
  if (platformTimer.value) {
    clearInterval(platformTimer.value as unknown as number);
    platformTimer.value = null;
  }
}

async function loadAuth(force = false) {
  try {
    const st = await authApi.status(force ? { force: true } : undefined as any);
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
    await loadAuth(true);
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
  await loadAuth(true);
  // Setup responsive detection
  const updateIsMobile = () => {
    isMobile.value = window.matchMedia('(max-width: 768px)').matches;
  };
  updateIsMobile();
  window.addEventListener('resize', updateIsMobile);
  // Store cleanup handler on instance via global to remove later
  (cleanupFns as any).push(() => window.removeEventListener('resize', updateIsMobile));
  // Start platform status polling
  startPlatformPolling();
  (cleanupFns as any).push(() => stopPlatformPolling());
});

// Refresh auth status on route changes so header/layout reacts after QR login
watch(() => router.currentRoute.value.fullPath, async () => {
  await loadAuth();
});

// Simple cleanup registry to avoid leaking listeners
const cleanupFns: Array<() => void> = [];
onBeforeUnmount(() => {
  cleanupFns.forEach((fn) => {
    try { fn(); } catch {}
  });
});

async function onLogout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await authApi.logout();
  } catch {}
  // Best-effort client cleanup as well
  try { sessionStorage.removeItem('mock-mode'); } catch {}
  // Force a full reload so the app re-checks auth status and shows the login screen
  location.reload();
}
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
.header-actions { display:flex; align-items:center; gap:8px; min-width: 0; }
.api-indicator { display:flex; align-items:center; gap:6px; padding: 4px 8px; border-radius: 999px; background: rgba(0,0,0,0.04); font-size:12px; }
.api-indicator .dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
.api-indicator .dot.online { background:#1b5e20; }
.api-indicator .dot.offline { background:#b71c1c; }
.api-indicator .dot.unknown { background:#9e9e9e; }
.api-indicator .api-text { color:#333; }
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

/* Platform operational status banner (for non-admin roles) */
.platform-banner { position: sticky; top: 0; z-index: 49; border-bottom: 1px solid; }
.platform-banner.warning { background: #fff8e1; border-color: #ffe082; }
.platform-banner.critical { background: #fdecea; border-color: #f4b1ab; }
.platform-banner__content { max-width: 1200px; margin: 0 auto; padding: 8px 16px; }
.platform-banner__text { display: flex; flex-direction: column; gap: 2px; }
.platform-banner.warning .platform-banner__text { color: #7a5d00; }
.platform-banner.critical .platform-banner__text { color: #7a1f1f; }
.platform-banner__text strong { font-weight: 700; }
.platform-banner__text .muted { opacity: 0.85; margin-left: 6px; }

.setup { display:flex; align-items:center; justify-content:center; padding: 40px 16px; }
.setup-card { background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:12px; padding:20px; max-width:480px; width:100%; display:flex; gap:12px; flex-direction:column; }
.setup-card h2 { margin:0 0 4px; }
.setup-card .hint { font-size:12px; color:#666; margin:0; }

/* Responsive helpers */
.only-mobile { display: none; }
.hide-on-mobile { display: inline-flex; }
@media (max-width: 768px) {
  .only-mobile { display: inline-flex; }
  .hide-on-mobile { display: none; }
  .header-actions { gap: 4px; }
  .api-indicator { padding: 2px 6px; gap: 4px; }
  .api-indicator .api-text { display: none; }
}
</style>

<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-layout class="layout">
      <n-layout-header bordered class="header">
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
            Profile
          </n-button>
        </div>
      </n-layout-header>

      <n-layout has-sider>
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
import { h, ref } from 'vue';
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
</style>

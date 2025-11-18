<template>
  <el-config-provider namespace="el">
    <el-container class="layout">
      <el-header height="56px" class="header">
        <div class="brand">
          <el-icon><Shop /></el-icon>
          <span>Buffet · Staff</span>
        </div>
        <div class="header-actions">
          <el-button type="primary" text :icon="Bell">Notifications</el-button>
          <el-button text :icon="User">Profile</el-button>
        </div>
      </el-header>
      <el-container>
        <el-aside width="220px" class="aside">
          <el-menu router :default-active="$route.path" class="menu" :collapse="collapsed">
            <el-menu-item index="/">
              <el-icon><DataAnalysis /></el-icon>
              <span>Dashboard</span>
            </el-menu-item>
            <el-menu-item index="/orders">
              <el-icon><List /></el-icon>
              <span>Órdenes</span>
            </el-menu-item>
            <el-menu-item index="/inventory">
              <el-icon><Box /></el-icon>
              <span>Inventario</span>
            </el-menu-item>
            <el-menu-item index="/menu">
              <el-icon><KnifeFork /></el-icon>
              <span>Menú</span>
            </el-menu-item>
            <el-menu-item index="/users">
              <el-icon><User /></el-icon>
              <span>Usuarios</span>
            </el-menu-item>
          </el-menu>
          <div class="aside-footer">
            <el-switch v-model="collapsed" active-text="Compact" inactive-text="Expanded" />
          </div>
        </el-aside>
        <el-main class="main">
          <RouterView />
        </el-main>
      </el-container>
    </el-container>
  </el-config-provider>
  
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElConfigProvider } from 'element-plus';
import { 
  Shop, List, Box, KnifeFork, DataAnalysis, User, Bell 
} from '@element-plus/icons-vue';

const collapsed = ref(false);
</script>

<style scoped>
.layout {
  min-height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color, #e0e0e0);
  backdrop-filter: saturate(180%) blur(8px);
}
.brand { display: flex; gap: 10px; align-items: center; font-weight: 600; }
.aside { border-right: 1px solid var(--el-border-color, #e0e0e0); display: flex; flex-direction: column; }
.menu { border-right: none; }
.aside-footer { margin-top: auto; padding: 12px; border-top: 1px solid var(--el-border-color-light, #ededed); }
.main { padding: 16px; background: var(--el-bg-color-page, #f6f7f9); }
</style>

<style>
/* Basic theme tweak */
:root {
  --el-color-primary: #0d47a1; /* deep blue */
}
</style>

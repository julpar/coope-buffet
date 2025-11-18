<template>
  <div class="app">
    <header class="app__header">
      <strong>Buffet · Staff</strong>
    </header>
    <nav class="app__nav">
      <RouterLink to="/" exact-active-class="active">Dashboard</RouterLink>
      <RouterLink to="/orders" exact-active-class="active">Órdenes</RouterLink>
      <RouterLink to="/inventory" exact-active-class="active">Inventario</RouterLink>
      <RouterLink to="/menu" exact-active-class="active">Menú</RouterLink>
      <RouterLink to="/users" exact-active-class="active">Usuarios</RouterLink>
    </nav>
    <main class="app__main">
      <RouterView />
    </main>
  </div>
  
</template>

<script setup lang="ts"></script>

<style>
:root {
  --primary: #0d47a1;
}
.app__header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--primary);
  color: #fff;
  padding: 12px 16px;
}
.app__nav {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  overflow-x: auto;
}
.app__nav a { color: #333; text-decoration: none; padding: 6px 10px; border-radius: 6px; }
.app__nav a.active { background: #e3f2fd; color: var(--primary); font-weight: 600; }
.app__main { padding: 12px; max-width: 960px; margin: 0 auto; }

.card { background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.col { flex: 1 1 260px; }
.btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:8px; border:1px solid #e0e0e0; background:#fafafa; cursor:pointer; }
.btn.primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.btn.ghost { background: transparent; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.input { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #e0e0e0; }
.table { width:100%; border-collapse: collapse; }
.table th, .table td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; }
.muted { opacity: .75; }

@media (prefers-color-scheme: dark) {
  body { background: #0b0b0b; color: #eaeaea; }
  .card { background: #141414; border-color: #1e1e1e; }
  .app__nav { border-color: #1e1e1e; }
  .input { background: #0f0f0f; color: #eaeaea; border-color: #1e1e1e; }
  .table th, .table td { border-color: #1e1e1e; }
}
</style>

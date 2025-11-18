import { createApp } from 'vue';

const App = {
  template: `
  <div>
    <header style="position:sticky;top:0;background:#0d47a1;color:#fff;padding:12px 16px;">
      <strong>Buffet · Staff</strong>
    </header>
    <main style="padding:16px">
      <h2 style="margin:0 0 8px">Dashboards</h2>
      <ul>
        <li>Fulfillment (pendiente)</li>
        <li>Stock monitoring (pendiente)</li>
        <li>Global operations (pendiente)</li>
      </ul>
      <p style="opacity:.8">Esta es una versión inicial para validar despliegue y estructura.</p>
    </main>
  </div>
  `
};

createApp(App).mount('#app');

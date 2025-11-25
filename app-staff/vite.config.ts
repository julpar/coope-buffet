import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    strictPort: false,
    host: true,
    // Note: No API proxying. Frontend should call the full API URL directly
    // using environment like VITE_SERVICE_URL_APP (e.g., http://localhost:3000)
    // and VITE_API_VERSION (e.g., v1) within the application code.
  },
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Group major dependencies into separate vendor chunks to keep the app chunk small
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/vue')) return 'vendor-vue';
            if (id.includes('naive-ui')) return 'vendor-naive';
            if (id.includes('@vueuse')) return 'vendor-vueuse';
            if (id.includes('@vicons')) return 'vendor-icons';
            if (id.includes('qrcode')) return 'vendor-qrcode';
            return 'vendor';
          }
        },
      },
    },
    // Keep a sensible warning limit; aim to stay below without just silencing
    chunkSizeWarningLimit: 600,
    target: 'es2019',
  },
  optimizeDeps: {
    // Pre-bundle frequently used deps to speed up dev and help rollup tree-shake better in build
    include: ['vue', 'vue-router', 'naive-ui', '@vueuse/core', '@vueuse/integrations', '@vicons/ionicons5', 'qrcode'],
  },
});

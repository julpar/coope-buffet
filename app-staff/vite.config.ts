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
});

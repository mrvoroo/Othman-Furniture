import { defineConfig } from 'vite';
export default defineConfig({
  server: { host: true, proxy: { '/api': 'http://localhost:3000' } },
  build: { target: 'es2022', rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } }, chunkSizeWarningLimit: 900 },
});

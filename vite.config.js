import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { host: true, proxy: { '/api': 'http://localhost:3000' } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500, rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } } },
});

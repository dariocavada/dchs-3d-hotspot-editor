import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  root: 'demo', envDir: '..', base: './',
  plugins: [vue({ template: { compilerOptions: { isCustomElement: tag => tag === 'model-viewer' } } })],
  build: { outDir: '../demo-dist', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 5173 }
});

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { isCustomElement: tag => tag === 'model-viewer' } } })],
  build: {
    lib: {
      entry: { index: 'src/index.ts', editor: 'src/editor.ts', firebase: 'src/firebase.ts', local: 'src/local.ts' },
      formats: ['es'], fileName: (_, name) => `${name}.js`, cssFileName: 'model-hotspot-editor'
    },
    sourcemap: true,
    rollupOptions: { external: id => /^(vue|vuetify|firebase|@google\/model-viewer)(\/|$)/.test(id) }
  }
});

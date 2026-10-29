import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({ build: { rollupOptions: { input: {
  main: fileURLToPath(new URL('./index.html', import.meta.url)),
  matambre: fileURLToPath(new URL('./matambre-preview.html', import.meta.url)),
  vacio: fileURLToPath(new URL('./vacio-preview.html', import.meta.url)),
} } } });

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // relative base keeps `dist/` working from a sub-folder (GitHub Pages, Netlify drop, ...)
  base: './',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});

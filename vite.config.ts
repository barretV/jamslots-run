import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { favoritesDevApiPlugin } from './scripts/vite-favorites-dev-api';

export default defineConfig({
  base: './',
  plugins: [favoritesDevApiPlugin(), react(), tailwindcss()],
  server: {
    port: 5290,
    strictPort: true,
    proxy: {
      '/api/run-jam': {
        target: 'https://api.run.world',
        changeOrigin: true,
        rewrite: () => '/v1/jams/octoberjam',
      },
    },
  },
  preview: {
    port: 5290,
    strictPort: true,
  },
});

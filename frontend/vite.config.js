// vite.config.js
// Configuração do Vite: plugin do React e proxy de /api para o backend
// durante o desenvolvimento (evita problema de CORS no ambiente local).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
});

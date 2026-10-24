import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/analyze': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/chat': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/links': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/summary': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/pqc': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/map': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});

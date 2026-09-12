import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/node_modules/lucide-react/') || id.includes('\\node_modules\\lucide-react\\')) {
              return 'vendor-icons';
            }
            if (
              id.includes('/node_modules/react/') ||
              id.includes('\\node_modules\\react\\') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('\\node_modules\\react-dom\\') ||
              id.includes('/node_modules/scheduler/') ||
              id.includes('\\node_modules\\scheduler\\')
            ) {
              return 'vendor-react';
            }
            if (id.includes('/node_modules/axios/') || id.includes('\\node_modules\\axios\\')) {
              return 'vendor-axios';
            }
            if (
              id.includes('exceljs') ||
              id.includes('file-saver')
            ) {
              return 'vendor-exceljs';
            }
            return 'vendor-libs';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});

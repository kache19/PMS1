import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: 'localhost',
        proxy: {
          '/api': {
            target: 'http://localhost',
            changeOrigin: true,
            secure: false,
          }
        }
      },
      plugins: [react()],
      build: {
        chunkSizeWarningLimit: 700,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
                if (id.includes('recharts')) return 'vendor-recharts';
                if (id.includes('lucide-react')) return 'vendor-icons';
                if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-print';
                return 'vendor';
              }
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

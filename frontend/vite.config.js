import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    hmr: {
      timeout: 120000,
    },
    watch: {
      ignored: (p) => {
        const normalized = p.replace(/\\/g, '/');
        return (
          normalized.includes('/backend/') ||
          normalized.endsWith('/backend') ||
          normalized.includes('/dist/') ||
          normalized.endsWith('/dist') ||
          normalized.includes('/.git/') ||
          normalized.endsWith('/.git') ||
          normalized.includes('/venv/') ||
          normalized.endsWith('/venv') ||
          normalized.includes('db.sqlite3')
        );
      }
    },
    proxy: {
      '^/api($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/token($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/(students|reports|sessions|groups|messages|users|roles|activity|auth|control-panel|institutions)($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          // Serve index.html to browser navigation/refresh requests
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
          }
        },
      },
    },
  },
})
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
      '^/students($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/reports($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/sessions($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/groups($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/messages($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/users($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/roles($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/activity($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/auth($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '^/control-panel($|/)': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
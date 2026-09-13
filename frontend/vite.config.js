import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function fallbackExtensionPlugin() {
  return {
    name: 'vite-plugin-fallback-extension',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith('/src/') || req.url.includes('/src/'))) {
          const cleanUrl = req.url.split('?')[0];
          if (cleanUrl.endsWith('.jsx')) {
            const filePath = path.resolve(__dirname, '.' + cleanUrl);
            if (!fs.existsSync(filePath)) {
              const tsxPath = filePath.replace(/\.jsx$/, '.tsx');
              if (fs.existsSync(tsxPath)) {
                req.url = req.url.replace(/\.jsx(\?|$)/, '.tsx$1');
              }
            }
          } else if (cleanUrl.endsWith('.js')) {
            const filePath = path.resolve(__dirname, '.' + cleanUrl);
            if (!fs.existsSync(filePath)) {
              const tsPath = filePath.replace(/\.js$/, '.ts');
              if (fs.existsSync(tsPath)) {
                req.url = req.url.replace(/\.js(\?|$)/, '.ts$1');
              }
            }
          }
        }
        next();
      });
    },
    async resolveId(source, importer, options) {
      if (source.endsWith('.jsx')) {
        const tsxSource = source.replace(/\.jsx$/, '.tsx');
        const resolved = await this.resolve(tsxSource, importer, { skipSelf: true, ...options });
        if (resolved) return resolved;
      } else if (source.endsWith('.js')) {
        const tsSource = source.replace(/\.js$/, '.ts');
        const resolved = await this.resolve(tsSource, importer, { skipSelf: true, ...options });
        if (resolved) return resolved;
      }
      return null;
    }
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    fallbackExtensionPlugin(),
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
      '^/media($|/)': {
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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas';
            }
            if (id.includes('dompurify')) {
              return 'vendor-dompurify';
            }
          }
        },
      },
    },
  },
})
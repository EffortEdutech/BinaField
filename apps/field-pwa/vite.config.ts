import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// The canonical local schema stays where BF-P1-07 froze it (no shadow copy). Vite may read it
// from outside this app's root; Vercel keeps "include files outside Root Directory" on for monorepos.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'BinaField Field',
        short_name: 'BinaField',
        description: 'Offline-first field workflow runtime',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0f5132',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,wasm}'], maximumFileSizeToCacheInBytes: 8 * 1024 * 1024 }
    })
  ],
  server: { fs: { allow: [repoRoot] } },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] }
});

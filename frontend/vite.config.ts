import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const buildSha = (process.env.CF_PAGES_COMMIT_SHA ?? 'dev').slice(0, 7)
const buildTime = new Date().toISOString()

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'PignusLabs_Logo.png'],
      workbox: {
        // Don't intercept navigation requests — Cloudflare Pages serves index.html
        // for all non-API routes, so this fallback is redundant and breaks iOS Safari
        // when the precached entry is stale or missing.
        navigateFallback: null,
        // API calls must always go to the network, never the SW cache.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'PignusInventario',
        short_name: 'Inventario',
        description: 'Gestión de inventario de filamentos',
        theme_color: '#1c1814',
        background_color: '#f5f0e8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8788'
    }
  }
})

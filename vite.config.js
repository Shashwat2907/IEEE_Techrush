import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'textures/*.jpg', 'textures/*.png'],
      manifest: {
        name: 'TripNest',
        short_name: 'TripNest',
        description: 'A context-aware travel itinerary companion.',
        theme_color: '#09090B',
        background_color: '#09090B',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(?:[a-d]\.)?basemaps\.cartocdn\.com\/.*$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'satellite-tiles', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
        ],
      },
    }),
  ],
})

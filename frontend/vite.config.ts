/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Icons (192, 512, maskable, apple-touch, favicon) are generated from the SVG logo.
      pwaAssets: {
        image: 'public/favicon.svg',
        preset: 'minimal-2023',
        includeHtmlHeadLinks: true,
        overrideManifestIcons: true,
      },
      manifest: {
        name: 'Todo Smart',
        short_name: 'Todo Smart',
        description: 'Tareas, proyectos, metas y tiempo de tu equipo en un solo lugar.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4EEE8',
        theme_color: '#C2410C',
      },
      workbox: {
        // Push notification handlers (public/push-sw.js).
        importScripts: ['push-sw.js'],
        navigateFallback: '/index.html',
        // API calls always go to the network; only the app shell is cached for now.
        navigateFallbackDenylist: [/^\/api\//, /^\/sanctum\//, /^\/up$/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    // In Docker the browser reaches Vite through nginx on :8090.
    allowedHosts: true,
    hmr: { clientPort: Number(process.env.VITE_HMR_PORT ?? 8090) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})

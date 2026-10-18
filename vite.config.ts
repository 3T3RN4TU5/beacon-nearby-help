/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const DAY = 60 * 60 * 24;
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// vercel.json is the single source of truth for security headers; `vite preview` (and therefore
// the e2e suite) serves the same CSP so a policy regression fails the tests.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const securityHeaders = Object.fromEntries(
  (vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? [])
    .filter((h) => h.key !== 'Strict-Transport-Security')
    .map((h) => [
      h.key,
      h.key === 'Content-Security-Policy' ? h.value.replace('; upgrade-insecure-requests', '') : h.value,
    ]),
);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // GitHub Pages serves from /<repo>/, every other host from /. The Pages workflow sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        // Unique per deployment path so it can't collide with other apps on a shared origin (GitHub Pages).
        id: process.env.BASE_PATH ?? '/',
        name: 'Beacon — Nearby Help',
        short_name: 'Beacon',
        description:
          'One tap to the nearest hospital, police, pharmacy and fuel, with routes, travel time and road-weather alerts.',
        theme_color: '#07090c',
        background_color: '#07090c',
        display: 'standalone',
        start_url: '.',
        categories: ['navigation', 'travel', 'utilities', 'medical'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'SOS & emergency numbers', short_name: 'SOS', url: './?panel=sos' },
          { name: 'Road weather', short_name: 'Weather', url: './?panel=weather' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Vector tiles, styles, glyphs and sprites: keep what the user has seen so the map works offline.
            urlPattern: ({ url }) => url.origin === 'https://tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'beacon-map',
              expiration: { maxEntries: 1500, maxAgeSeconds: 14 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://gibs.earthdata.nasa.gov',
            handler: 'CacheFirst',
            options: {
              cacheName: 'beacon-night-lights',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  preview: {
    headers: securityHeaders,
  },
  build: {
    target: 'es2022',
    // MapLibre alone is ~1 MB minified; it is split out below so app updates don't re-download it.
    chunkSizeWarningLimit: 1100,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'maplibre', test: /node_modules[\\/]maplibre-gl/, priority: 30 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});

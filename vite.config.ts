import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  const disableDevSw = process.env.DISABLE_HMR === 'true';
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(disableDevSw
        ? [
            {
              name: 'cleanup-stale-dev-sw',
              configureServer(server: {
                middlewares: {
                  use: (
                    fn: (
                      req: { url?: string },
                      res: {
                        setHeader: (name: string, value: string) => void;
                        end: (body: string) => void;
                      },
                      next: () => void
                    ) => void
                  ) => void;
                };
              }) {
                server.middlewares.use((req, res, next) => {
                  if (req.url && /^\/(dev-sw|sw)\.js(\?|$)/.test(req.url)) {
                    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store');
                    res.end(
                      "self.addEventListener('install',()=>self.skipWaiting());" +
                        "self.addEventListener('activate',e=>e.waitUntil(" +
                        "caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))" +
                        ".then(()=>self.registration.unregister())" +
                        '.then(()=>self.clients.matchAll())' +
                        '.then(cs=>cs.forEach(c=>c.navigate(c.url)))));'
                    );
                    return;
                  }
                  next();
                });
              },
            },
          ]
        : []),
      VitePWA({
        // Android packages its assets locally; a web service worker must not replace them.
        disable: process.env.BUILD_TARGET === 'android',
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'MIND//BREAK: Kinetic Rebels',
          short_name: 'MIND//BREAK',
          description: 'Beat em Up 2.5D psíquico com ação acrobática em 8 fases urbanas para Web e Android.',
          theme_color: '#090714',
          background_color: '#090714',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
        devOptions: {
          enabled: process.env.DISABLE_HMR !== 'true',
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

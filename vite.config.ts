import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        watch: {
          usePolling: false,
          ignored: [
            '**/android/**',
            '**/ios/**',
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**'
          ]
        },
        hmr: {
          overlay: true
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          devOptions: { enabled: true },
          includeAssets: ['icon-192x192.png', 'icon-512x512.png'],
          manifest: {
            name: "Montanha Bilhar e Jukebox",
            short_name: "Montanha",
            description: "Gerenciamento de locação de mesas de bilhar, jukebox e gruas.",
            theme_color: "#84cc16",
            icons: [
              {
                src: "/icon-192x192.png",
                sizes: "192x192",
                type: "image/png"
              },
              {
                src: "/icon-512x512.png",
                sizes: "512x512",
                type: "image/png"
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});

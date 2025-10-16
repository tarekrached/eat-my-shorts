import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Eat My Shorts - BART Tracker',
        short_name: 'BART Tracker',
        description: 'Track BART train times between home and work',
        theme_color: '#000000',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          }
        ],
        start_url: '.',
        display: 'standalone'
      }
    })
  ],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})

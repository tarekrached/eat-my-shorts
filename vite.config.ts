import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

/**
 * Custom Vite middleware to proxy BART's GTFS static ZIP.
 * BART redirects google_transit.zip to a versioned URL — http-proxy doesn't
 * follow redirects, so the browser ends up hitting CORS on the redirect target.
 * This middleware uses Node's native fetch (which follows redirects) instead.
 */
function gtfsStaticProxy(): Plugin {
  return {
    name: 'gtfs-static-proxy',
    configureServer(server) {
      server.middlewares.use('/proxy/gtfs-static', async (req, res) => {
        try {
          const url = 'https://www.bart.gov/dev/schedules' + req.url
          const response = await fetch(url, { redirect: 'follow' })
          res.writeHead(response.status, {
            'content-type': response.headers.get('content-type') || 'application/octet-stream',
            'access-control-allow-origin': '*',
          })
          const buffer = Buffer.from(await response.arrayBuffer())
          res.end(buffer)
        } catch (e: any) {
          res.writeHead(502)
          res.end(e.message)
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    gtfsStaticProxy(),
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
  base: '/eat-my-shorts/',
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    proxy: {
      '/proxy/gtfsrt': {
        target: 'https://api.bart.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/gtfsrt/, '/gtfsrt'),
      },
      '/proxy/bart-api': {
        target: 'https://api.bart.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/bart-api/, '/api'),
      },
    },
  }
})

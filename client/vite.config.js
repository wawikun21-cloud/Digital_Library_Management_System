// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Raise the warning threshold slightly — individual vendor chunks
    // like xlsx are expected to be large, but they load on-demand only.
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks: {
          // React core — always needed, cached aggressively
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          // Charts — only needed on Dashboard
          'vendor-charts': ['recharts'],
          // xlsx — only needed when user opens an import modal
          'vendor-xlsx':   ['xlsx'],
          // UI primitives
          'vendor-ui':     ['lucide-react', '@radix-ui/react-dropdown-menu'],
          // WebSocket client
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        secure:       false,
      },
      '/socket.io': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        secure:       false,
        ws:           true,
      },
    },
  },
})
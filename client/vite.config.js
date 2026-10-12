// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  test: {
    // Default node environment. The five files that need a DOM opt in with a
    // `@vitest-environment jsdom` docblock, so the DOM suite stays small.
    environment: 'node',

    // The default, stated explicitly: it is a budget, not a knob. Tests that
    // need more than 5s are slow and must be fixed, not granted a longer
    // timeout. See features/roles/hooks/*.test.jsx — the fix there was to stop
    // `await import()`-ing the module graph inside a test body, which had been
    // charging ~4s of cold transform to the first test's timeout.
    testTimeout: 5000,

    // Restore every spy after each test so a mock cannot leak between tests.
    // This makes the per-file `vi.restoreAllMocks()` calls unnecessary.
    restoreMocks: true,

    // Each file still gets its own module registry and environment. Turning
    // this off would make the suite meaningfully faster and would also let one
    // file's state bleed into the next, so it stays on.
    isolate: true,

    fileParallelism: true,
  },

  build: {
    // Write the production client bundle to the repository-root `dist/` so a
    // single-domain deployment (e.g. Hostinger "Output directory: dist")
    // finds the built SPA exactly where the publish hook expects it. This
    // only affects `vite build`; the dev server keeps emitting to memory.
    outDir:         '../dist',
    emptyOutDir:    true,

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
      // Uploaded PDFs / images are served by Express, not Vite. Without this the
      // dev server answers with index.html and pdf.js fails with InvalidPDFException.
      '/uploads': {
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
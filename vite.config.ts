import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite/Rollup shared helper virtual modules (__vitePreload, CJS
          // interop) are used by eager code (lazy routes, every CJS lib).
          // Pin them to the eager vendor chunk — otherwise Rollup may park
          // them inside vendor-pdf, dragging that whole lazy chunk into the
          // initial load via a static import edge.
          if (
            id.includes('vite/preload-helper') ||
            id.includes('commonjsHelpers') ||
            id.includes('commonjs-dynamic-modules')
          ) {
            return 'vendor';
          }
          if (id.includes('/pages/')) {
            const match = id.match(/\/pages\/([^/]+)\.[tj]sx?$/);
            if (match) return `page-${match[1]}`;
          }
          if (id.includes('node_modules')) {
            // PDF libs + their PDF-only subtree are loaded on demand (dynamic
            // import) — keep them in one chunk so they stay out of the eager
            // vendor bundle. (@babel/runtime is intentionally NOT listed: it is
            // shared with eager code, and routing it here would drag the whole
            // PDF chunk back into the initial load via a static import edge.)
            if (/node_modules[/\\](jspdf|html2canvas|pako|fflate|fast-png|css-line-break|text-segmentation|utrie|base64-arraybuffer|iobuffer)[/\\]/.test(id)) return 'vendor-pdf';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            return 'vendor';
          }
        },
      },
    },
  },
});

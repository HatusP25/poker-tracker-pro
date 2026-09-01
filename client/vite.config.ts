import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        /* Function form, not the object form.
         *
         * `manualChunks: { 'recharts-vendor': ['recharts'] }` assigns recharts'
         * entire module subgraph to that chunk — including `clsx`, which
         * `lib/utils.ts` imports directly for `cn()` and which the eager app
         * shell therefore needs. Rollup resolved that by making every route
         * chunk import `recharts-vendor`, and Vite emitted a modulepreload for
         * it in index.html: 415 kB of charting library on the critical path of
         * the home screen, which is exactly what splitting it out was meant to
         * avoid.
         *
         * Matching on the module path instead keeps shared leaf dependencies
         * in the common chunk, so recharts loads only on the routes that
         * actually draw something. */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          /* `clsx` is both a recharts dependency and what `cn()` uses, so
           * leaving it unassigned let Rollup hoist it into recharts-vendor and
           * drag the whole 415 kB chunk onto every route. Give the shared leaf
           * utilities a chunk of their own. */
          if (/[\\/]node_modules[\\/](clsx|tailwind-merge)[\\/]/.test(id)) return 'utils-vendor';
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor';
          if (/[\\/]node_modules[\\/]react-router/.test(id)) return 'router-vendor';
          if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) return 'query-vendor';
          if (
            /[\\/]node_modules[\\/](recharts|d3-[a-z]+|victory-vendor|internmap|delaunator|robust-predicates|decimal\.js-light|fast-equals)[\\/]/.test(
              id
            )
          )
            return 'recharts-vendor';
          if (/[\\/]node_modules[\\/](cmdk|sonner)[\\/]/.test(id)) return 'ui-vendor';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase warning limit since we've split chunks
  },
});

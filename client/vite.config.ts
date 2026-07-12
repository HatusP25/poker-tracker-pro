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
        manualChunks: {
          // Split React and React-DOM into their own chunk
          'react-vendor': ['react', 'react-dom'],
          // Split React Router into its own chunk
          'router-vendor': ['react-router-dom'],
          // Split TanStack Query into its own chunk
          'query-vendor': ['@tanstack/react-query'],
          // Split Recharts into its own chunk (heavy charting library)
          'recharts-vendor': ['recharts'],
          // Split UI libraries into their own chunk
          'ui-vendor': ['cmdk', 'sonner'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase warning limit since we've split chunks
  },
});

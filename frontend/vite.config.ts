import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // MapLibre loads a separate worker module; Vite's dependency optimizer can
  // leave that worker pointing at a stale optimized path during local reloads.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001',
      '/health': process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001',
    },
  },
  build: { rollupOptions: { output: { manualChunks: { map: ['maplibre-gl'] } } } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.*', 'src/types.ts'],
    },
  },
});

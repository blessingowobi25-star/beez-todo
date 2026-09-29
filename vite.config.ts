import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Single source of truth for dev/build/test configuration (see AGENTS.md).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // The full app shell renders a lot of markup, so userEvent interactions in
    // App.test.tsx need more headroom than Vitest's 5s default.
    testTimeout: 20000,
  },
});

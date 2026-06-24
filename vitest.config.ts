import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@bookmark-assistant/contracts': fileURLToPath(
        new URL('./packages/contracts/src/index.ts', import.meta.url)
      ),
      '@bookmark-assistant/extension-core': fileURLToPath(
        new URL('./packages/extension-core/src/index.ts', import.meta.url)
      ),
      '@bookmark-assistant/server-core': fileURLToPath(
        new URL('./packages/server-core/src/index.ts', import.meta.url)
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'packages/contracts/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'packages/extension/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'packages/extension-core/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'packages/server/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'packages/server-core/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'tests/integration/**',
      'tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'build/', '**/*.config.{js,ts}', '**/*.d.ts', 'tests/'],
    },
  },
});

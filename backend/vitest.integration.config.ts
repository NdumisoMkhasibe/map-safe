import { defineConfig } from 'vitest/config';

/** Integration runs are deliberately opt-in and point only at disposable PostgreSQL. */
export default defineConfig({
  test: {
    include: ['tests/**/*.integration.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});

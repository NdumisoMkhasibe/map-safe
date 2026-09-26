import { configDefaults, defineConfig } from 'vitest/config';

/** Fast deterministic tests do not require a local PostgreSQL daemon. */
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/prisma/**', 'src/**/*.d.ts'],
    },
  },
});

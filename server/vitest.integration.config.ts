import { defineConfig } from 'vitest/config';

// Integration tests run against a disposable PostgreSQL database.
// Override with TEST_DATABASE_URL; defaults to a local `poker_tracker_test` DB.
const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://hatuspellegrini@localhost:5432/poker_tracker_test';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    // Set before any test module (and the Prisma singleton) is imported.
    env: {
      DATABASE_URL: testDbUrl,
      NODE_ENV: 'test',
    },
    // DB tests share tables; run them serially to keep cleanup deterministic.
    fileParallelism: false,
    setupFiles: ['tests/integration/setup.ts'],
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests are co-located in src/ and need no database.
    // DB-backed integration tests live under tests/ and use vitest.integration.config.ts.
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});

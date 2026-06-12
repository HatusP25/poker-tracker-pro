import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests run anywhere; integration tests that need a DB live under tests/integration
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});

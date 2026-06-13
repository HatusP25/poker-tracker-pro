import { defineConfig, devices } from '@playwright/test';

// E2E runs the production artifact: the built SPA served by the Express server
// (NODE_ENV=production serves server/public + SPA fallback) against a disposable
// PostgreSQL database. This mirrors the Railway/Docker deployment path.
const PORT = process.env.E2E_PORT || '3100';
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  'postgresql://hatuspellegrini@localhost:5432/poker_tracker_e2e';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `cd server && node dist/index.js`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'production',
      PORT,
      DATABASE_URL: E2E_DATABASE_URL,
    },
  },
});

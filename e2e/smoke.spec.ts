import { test, expect } from '@playwright/test';

test('production stack boots: API health + SPA shell render', async ({ page, request }) => {
  // API is up and reports healthy.
  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).status).toBe('OK');

  // SPA serves and mounts (group selection is the entry point with no group set).
  await page.goto('/groups');
  await expect(page.getByText('Select Poker Group')).toBeVisible();
});

import { test, expect } from '@playwright/test';
import { seedGroup, selectGroupInBrowser } from './helpers';

// Insights is read-only analytics. We seed a group + players through the API,
// select it in the browser, then verify the Insights page renders every module
// and that the G+I keyboard shortcut navigates there.
test.describe('Insights', () => {
  test('renders all modules', async ({ page, request }) => {
    const seed = await seedGroup(request, `Insights Night ${Date.now()}`, ['Alice', 'Bob'], 100);
    await selectGroupInBrowser(page, { id: seed.groupId, name: 'Insights Night', defaultBuyIn: 100 });

    await page.goto('/insights');

    await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hall of Fame' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The Race for #1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Form & Momentum' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rivalries' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Poker Wrapped' })).toBeVisible();
  });

  test('G+I keyboard shortcut navigates to Insights', async ({ page, request }) => {
    const seed = await seedGroup(request, `Insights Shortcut ${Date.now()}`, ['Alice', 'Bob'], 100);
    await selectGroupInBrowser(page, { id: seed.groupId, name: 'Insights Shortcut', defaultBuyIn: 100 });

    await page.goto('/');
    await page.keyboard.press('g');
    await page.keyboard.press('i');
    await expect(page).toHaveURL(/\/insights$/);
  });
});

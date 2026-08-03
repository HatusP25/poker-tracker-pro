import { test, expect } from '@playwright/test';
import { seedGroup, selectGroupInBrowser } from './helpers';

/**
 * Seasons through the browser: define one in Settings, then recap it in Insights
 * instead of a calendar year.
 */
test('a group can define a season and recap it', async ({ page, request }) => {
  const seed = await seedGroup(request, `Season Night ${Date.now()}`, ['Alice', 'Bob'], 100);
  await selectGroupInBrowser(page, { id: seed.groupId, name: 'Season Night', defaultBuyIn: 100 });

  // A night inside the season we're about to define.
  const created = await request.post('/api/sessions', {
    data: {
      groupId: seed.groupId,
      date: '2026-04-15',
      entries: [
        { playerId: seed.players[0].id, buyIn: 100, cashOut: 160 },
        { playerId: seed.players[1].id, buyIn: 100, cashOut: 40 },
      ],
    },
  });
  expect(created.ok()).toBeTruthy();

  await page.goto('/settings');
  await expect(page.getByText('No seasons yet')).toBeVisible();

  await page.getByLabel('Season name').fill('Spring Run');
  await page.getByLabel('Season start').fill('2026-03-01');
  await page.getByLabel('Season end').fill('2026-05-31');
  await page.getByRole('button', { name: 'Add season' }).click();

  // The closing day must survive the round trip: a UTC-anchored end, displayed local.
  await expect(page.getByTestId('season-Spring Run')).toContainText('Mar 01, 2026');
  await expect(page.getByTestId('season-Spring Run')).toContainText('May 31, 2026');

  // Overlapping seasons are refused, so a night can only belong to one.
  await page.getByLabel('Season name').fill('Clash');
  await page.getByLabel('Season start').fill('2026-05-01');
  await page.getByLabel('Season end').fill('2026-07-01');
  await page.getByRole('button', { name: 'Add season' }).click();
  await expect(page.getByText(/overlaps "Spring Run"/)).toBeVisible();

  // Poker Wrapped can now recap that season.
  await page.goto('/insights');
  const picker = page.getByLabel('Period');
  await expect(picker).toBeVisible();
  await picker.selectOption({ label: 'Spring Run' });

  // The recap now covers the season, not a calendar year. Scope to the card so the
  // assertion can't be satisfied by the (hidden) <option> of the picker itself.
  const recap = page.locator('section', { hasText: 'Poker Wrapped' });
  await expect(recap.getByText('1 nights · $200 on the table')).toBeVisible();
  // Alice won the only night in the season, so she takes the superlatives.
  await expect(recap.getByText('Alice').first()).toBeVisible();
});

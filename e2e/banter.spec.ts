import { test, expect, APIRequestContext } from '@playwright/test';
import { seedGroup, selectGroupInBrowser, SeededGroup } from './helpers';

// Banter Pack is read-only and derived from session history. We seed a group,
// players, and one completed session through the API, then verify the Belt card
// and Recent Unlocks render on Insights, the Trophy Case renders on a player
// page, and the Copy-for-WhatsApp button appears on the session detail.

async function seedCompletedSession(request: APIRequestContext, seed: SeededGroup) {
  const res = await request.post('/api/sessions', {
    data: {
      groupId: seed.groupId,
      date: '2026-07-10',
      entries: [
        { playerId: seed.players[0].id, buyIn: 100, cashOut: 150 },
        { playerId: seed.players[1].id, buyIn: 100, cashOut: 50 },
      ],
    },
  });
  if (!res.ok()) {
    throw new Error(`Failed to seed session: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

test.describe('Banter Pack', () => {
  test('Belt card and Recent Unlocks render on Insights with a champion', async ({ page, request }) => {
    const seed = await seedGroup(request, `Banter Belt ${Date.now()}`, ['Alice', 'Bob'], 100);
    await seedCompletedSession(request, seed);
    await selectGroupInBrowser(page, { id: seed.groupId, name: 'Banter Belt', defaultBuyIn: 100 });

    await page.goto('/insights');

    await expect(page.getByRole('heading', { name: 'The Belt' })).toBeVisible();
    // Alice won the seeded night, so she is the retroactively computed champion.
    await expect(page.getByText('🥇 Alice')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Unlocks' })).toBeVisible();
  });

  test('Trophy Case renders earned and unearned badges on player detail', async ({ page, request }) => {
    const seed = await seedGroup(request, `Banter Trophy ${Date.now()}`, ['Alice', 'Bob'], 100);
    await seedCompletedSession(request, seed);
    await selectGroupInBrowser(page, { id: seed.groupId, name: 'Banter Trophy', defaultBuyIn: 100 });

    await page.goto(`/players/${seed.players[0].id}`);

    await expect(page.getByRole('heading', { name: 'Trophy Case' })).toBeVisible();
    // The full 10-badge catalog renders (earned lit, unearned greyed).
    await expect(page.getByText('Hat Trick', { exact: true })).toBeVisible();
    await expect(page.getByText('Untouchable', { exact: true })).toBeVisible();
  });

  test('Copy for WhatsApp button appears on a completed session', async ({ page, request }) => {
    const seed = await seedGroup(request, `Banter Copy ${Date.now()}`, ['Alice', 'Bob'], 100);
    const session = await seedCompletedSession(request, seed);
    await selectGroupInBrowser(page, { id: seed.groupId, name: 'Banter Copy', defaultBuyIn: 100 });

    await page.goto(`/sessions/${session.id}`);

    await expect(page.getByRole('button', { name: 'Copy for WhatsApp' })).toBeVisible();
  });
});

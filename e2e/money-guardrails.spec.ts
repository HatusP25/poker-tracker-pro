import { test, expect } from '@playwright/test';
import { seedGroup, selectGroupInBrowser } from './helpers';

// Starts a live session via the API, then drives the End Session dialog in the
// browser to prove the money-input guardrails (negative cash-out is rejected
// with a clear message, blocks the action, and clamps to 0 on blur).
async function startLiveSession(request: import('@playwright/test').APIRequestContext, groupId: string, players: {id: string}[]) {
  const res = await request.post('/api/live-sessions/start', {
    data: {
      groupId,
      date: new Date().toISOString().slice(0, 10),
      startTime: '19:00',
      players: players.map((p) => ({ playerId: p.id, buyIn: 100 })),
    },
  });
  if (!res.ok()) throw new Error(`start failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).id as string;
}

test('negative cash-out is blocked, explained, and clamped on blur', async ({ page, request }) => {
  const seed = await seedGroup(request, `Guardrails ${Date.now()}`, ['Alice', 'Bob'], 100);
  const sessionId = await startLiveSession(request, seed.groupId, seed.players);
  await selectGroupInBrowser(page, { id: seed.groupId, name: 'Guardrails', defaultBuyIn: 100 });

  await page.goto(`/live/${sessionId}`);
  await page.getByRole('button', { name: 'End Session' }).click();

  const aliceCashout = page.getByTestId('cashout-input-Alice');
  await aliceCashout.fill('-5');

  // A clear, specific reason is shown...
  await expect(page.getByText("Cash-out can't be negative (min $0)")).toBeVisible();
  // ...and the action is blocked.
  await expect(page.getByRole('button', { name: 'End Session' }).last()).toBeDisabled();

  // On blur the nonsensical value clamps to 0.
  await aliceCashout.blur();
  await expect(aliceCashout).toHaveValue('0');
});

test('completed-session form blocks a negative buy-in', async ({ page, request }) => {
  const seed = await seedGroup(request, `Guardrails Entry ${Date.now()}`, ['Alice', 'Bob'], 100);
  await selectGroupInBrowser(page, { id: seed.groupId, name: 'Guardrails Entry', defaultBuyIn: 100 });

  await page.goto('/entry');

  // Pick a player in the first row, then type a nonsensical buy-in.
  await page.locator('select').first().selectOption({ label: 'Alice' });
  const buyIn = page.getByPlaceholder('Buy-in').first();
  await buyIn.fill('-5');

  await expect(page.getByTestId('buyin-error')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Session' })).toBeDisabled();

  // Correcting it re-enables the field's validity (error clears).
  await buyIn.fill('100');
  await expect(page.getByTestId('buyin-error')).toHaveCount(0);
});

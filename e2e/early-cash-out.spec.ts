import { test, expect } from '@playwright/test';
import { seedGroup, selectGroupInBrowser } from './helpers';

/**
 * Wave 1 through the real browser: someone leaves the game early, and the table
 * doesn't count out to the cent at the end. Both are ordinary home-game events
 * that the app previously had no answer for.
 */

async function startLiveNight(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
  players: string[]
) {
  const seed = await seedGroup(request, `Cash Out Night ${Date.now()}`, players, 100);
  await selectGroupInBrowser(page, {
    id: seed.groupId,
    name: 'Cash Out Night',
    defaultBuyIn: 100,
  });

  await page.goto('/live/start');
  for (const name of players) {
    await page.getByRole('checkbox', { name }).check();
  }
  await page.getByRole('button', { name: 'Start Live Session' }).click();
  await expect(page).toHaveURL(/\/live\/[^/]+$/);

  return seed;
}

test('a player leaves early and the night settles around them', async ({ page, request }) => {
  await startLiveNight(page, request, ['Alice', 'Bob', 'Cara']);

  // Bob leaves at 11 with $150 of the $300 on the table.
  await page.getByRole('button', { name: 'Cash out Bob' }).click();
  await page.getByTestId('early-cashout-input').fill('150');
  await page.getByRole('button', { name: 'Cash out' }).last().click();

  // He stays in the standings with his result, and can be put back.
  const bob = page.getByTestId('standing-Bob');
  await expect(bob).toContainText('+$50.00');
  await expect(bob).toContainText('Cashed out');
  await expect(page.getByRole('button', { name: 'Undo cash-out for Bob' })).toBeVisible();
  await expect(page.getByText('2 at the table · 1 cashed out')).toBeVisible();

  // End Session only asks for the two still playing.
  await page.getByRole('button', { name: 'End Session' }).click();
  await expect(page.getByText('Already cashed out')).toBeVisible();
  await expect(page.getByTestId('cashout-input-Bob')).toHaveCount(0);

  await page.getByTestId('cashout-input-Alice').fill('150');
  await page.getByTestId('cashout-input-Cara').fill('0');
  await page.getByRole('button', { name: 'End Session' }).last().click();

  // Bob's early result is part of the settlement.
  await expect(page).toHaveURL(/\/settlement$/);
  await expect(page.getByText('Zero-sum validated')).toBeVisible();
});

test('a cashed-out player cannot rebuy until the cash-out is undone', async ({ page, request }) => {
  await startLiveNight(page, request, ['Alice', 'Bob', 'Cara']);

  await page.getByRole('button', { name: 'Cash out Bob' }).click();
  await page.getByTestId('early-cashout-input').fill('150');
  await page.getByRole('button', { name: 'Cash out' }).last().click();
  await expect(page.getByTestId('standing-Bob')).toContainText('Cashed out');

  // Bob is no longer offered in the rebuy picker.
  await page.getByRole('button', { name: 'Rebuy' }).click();
  await page.getByRole('combobox').click();
  await expect(page.getByRole('option', { name: /Bob/ })).toHaveCount(0);
  await expect(page.getByRole('option', { name: /Alice/ })).toBeVisible();
});

test('an unbalanced table can be reconciled by splitting the difference', async ({
  page,
  request,
}) => {
  await startLiveNight(page, request, ['Alice', 'Bob']);

  // $200 pot; count out $190 — $10 short, as chip counts usually are.
  await page.getByRole('button', { name: 'End Session' }).click();
  await page.getByTestId('cashout-input-Alice').fill('100');
  await page.getByTestId('cashout-input-Bob').fill('90');

  // The helper appears and End Session stays disabled until it reconciles.
  await expect(page.getByTestId('reconcile-helper')).toContainText('$10.00 short');
  await expect(page.getByRole('button', { name: 'End Session' }).last()).toBeDisabled();

  await page.getByTestId('reconcile-split').click();

  // $5 each, and the night can now be ended.
  await expect(page.getByTestId('cashout-input-Alice')).toHaveValue('105');
  await expect(page.getByTestId('cashout-input-Bob')).toHaveValue('95');
  await expect(page.getByTestId('reconcile-helper')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'End Session' }).last()).toBeEnabled();

  await page.getByRole('button', { name: 'End Session' }).last().click();
  await expect(page).toHaveURL(/\/settlement$/);
  await expect(page.getByText('Zero-sum validated')).toBeVisible();
});

test.describe('on a phone', () => {
  // The live view is the one screen used with people at the table, so it has to
  // work in a hand. iPhone-ish viewport.
  test.use({ viewport: { width: 390, height: 844 } });

  test('the whole live flow is usable at phone width', async ({ page, request }) => {
    await startLiveNight(page, request, ['Alice', 'Bob', 'Cara']);

    // Standings read as cards, and the actions stay reachable without scrolling.
    await expect(page.getByTestId('standing-Alice')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rebuy' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'End Session' })).toBeInViewport();

    // The page itself must not scroll sideways.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflows).toBe(false);

    // Cash-out works from the card.
    await page.getByRole('button', { name: 'Cash out Bob' }).click();
    await page.getByTestId('early-cashout-input').fill('150');
    await page.getByRole('button', { name: 'Cash out' }).last().click();
    await expect(page.getByTestId('standing-Bob')).toContainText('Cashed out');
  });
});

test('the difference can be pinned on whoever miscounted', async ({ page, request }) => {
  await startLiveNight(page, request, ['Alice', 'Bob']);

  await page.getByRole('button', { name: 'End Session' }).click();
  await page.getByTestId('cashout-input-Alice').fill('100');
  await page.getByTestId('cashout-input-Bob').fill('90');

  await page.getByTestId('reconcile-assignee').click();
  await page.getByRole('option', { name: 'Bob' }).click();
  await page.getByTestId('reconcile-assign').click();

  await expect(page.getByTestId('cashout-input-Alice')).toHaveValue('100');
  await expect(page.getByTestId('cashout-input-Bob')).toHaveValue('100');
  await expect(page.getByRole('button', { name: 'End Session' }).last()).toBeEnabled();
});

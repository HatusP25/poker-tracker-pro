import { test, expect } from '@playwright/test';
import { seedGroup, selectGroupInBrowser } from './helpers';

// Full money-critical flow through the real browser UI against the production
// server + database: start a live session, add a rebuy, end with balanced
// cash-outs, and verify the computed settlement. Exercises F-02/F-03/F-04
// end to end (validation, atomic end, zero-sum settlement).
test('live session: start -> rebuy -> end -> settlement', async ({ page, request }) => {
  const seed = await seedGroup(request, `E2E Night ${Date.now()}`, ['Alice', 'Bob'], 100);
  await selectGroupInBrowser(page, { id: seed.groupId, name: 'E2E Night', defaultBuyIn: 100 });

  // Start a live session with both players at the default $100 buy-in.
  await page.goto('/live/start');
  await expect(page.getByRole('heading', { name: 'Start Live Session' })).toBeVisible();

  await page.getByRole('checkbox', { name: 'Alice' }).check();
  await page.getByRole('checkbox', { name: 'Bob' }).check();

  await page.getByRole('button', { name: 'Start Live Session' }).click();

  // Landed on the live view.
  await expect(page).toHaveURL(/\/live\/[^/]+$/);
  await expect(page.getByText('Current Standings')).toBeVisible();

  // Add a $100 rebuy for Alice -> her buy-in becomes $200.
  await page.getByRole('button', { name: 'Rebuy', exact: true }).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: /Alice/ }).click();
  // Amount input defaults to the $100 default buy-in.
  await page.getByRole('button', { name: 'Add Rebuy' }).last().click();

  // Standings now show Alice at $200.
  await expect(page.getByTestId('standing-Alice')).toContainText('$200.00');

  // End the session: Alice cashes out $0, Bob cashes out $300 (zero-sum vs $300 pot).
  await page.getByRole('button', { name: 'End Session' }).click();
  await page.getByTestId('cashout-input-Alice').fill('0');
  await page.getByTestId('cashout-input-Bob').fill('300');

  // The dialog's End Session button is enabled only when balanced.
  await page.getByRole('button', { name: 'End Session' }).last().click();

  // Settlement page: Alice (-200) pays Bob (+200).
  await expect(page).toHaveURL(/\/settlement$/);
  await expect(page.getByText('Session Complete!')).toBeVisible();

  const row = page.getByTestId('settlement-row');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Alice');
  await expect(row).toContainText('Bob');
  await expect(row).toContainText('$200.00');
  await expect(page.getByText('Zero-sum validated')).toBeVisible();
});

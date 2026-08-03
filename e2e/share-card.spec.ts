import { test, expect } from '@playwright/test';
import { seedGroup, selectGroupInBrowser } from './helpers';

/**
 * The share card has to actually produce a PNG in a real browser — the layout is
 * unit-tested, but canvas rendering, the blob and the download path are not
 * reachable from jsdom. Headless Chromium has no share sheet, so this exercises
 * the download fallback.
 */
test('a finished night can be shared as an image', async ({ page, request }) => {
  const seed = await seedGroup(request, `Share Night ${Date.now()}`, ['Alice', 'Bob'], 100);
  await selectGroupInBrowser(page, { id: seed.groupId, name: 'Share Night', defaultBuyIn: 100 });

  // A completed night, entered directly.
  const created = await request.post('/api/sessions', {
    data: {
      groupId: seed.groupId,
      date: '2026-05-01',
      entries: [
        { playerId: seed.players[0].id, buyIn: 100, cashOut: 160 },
        { playerId: seed.players[1].id, buyIn: 100, cashOut: 40 },
      ],
    },
  });
  expect(created.ok()).toBeTruthy();
  const session = await created.json();

  await page.goto(`/sessions/${session.id}`);

  const shareButton = page.getByRole('button', { name: 'Share image' });
  await expect(shareButton).toBeVisible();

  const download = await Promise.race([
    page.waitForEvent('download', { timeout: 15000 }),
    shareButton.click().then(() => page.waitForEvent('download', { timeout: 15000 })),
  ]);

  expect(download.suggestedFilename()).toBe('poker-night-2026-05-01.png');

  // A real PNG, not an empty blob: check the file signature and a sane size.
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const bytes = readFileSync(path!);
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  expect(bytes.length).toBeGreaterThan(5000);
});

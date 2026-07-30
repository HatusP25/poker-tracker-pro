import { test, expect } from '@playwright/test';
import { seedGroup, selectGroupInBrowser } from './helpers';

/**
 * A "replace" restore deletes real poker history. These tests drive the actual
 * browser flow to prove the two safety properties the UI promises:
 *   1. nothing is deleted until the user names the group out loud, and
 *   2. an old (v1) backup can't be used to replace at all.
 */

/** Writes a backup file to disk-free memory and hands it to the file input. */
async function chooseBackupFile(page: import('@playwright/test').Page, backup: unknown) {
  await page.locator('#backup-file-input').setInputFiles({
    name: 'poker-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
}

test('replace restore is gated behind typing the group name', async ({ page, request }) => {
  const group = await seedGroup(request, 'Replace Gate Group', ['Ana', 'Dave']);
  await selectGroupInBrowser(page, { id: group.groupId, name: 'Replace Gate Group' });

  // Take a real backup through the API so the file matches the current format.
  const exported = await request.get(`/api/backup/export/${group.groupId}`);
  expect(exported.ok()).toBeTruthy();
  const backup = await exported.json();

  await page.goto('/settings');
  await page.getByRole('radio', { name: /Replace/ }).check();
  await chooseBackupFile(page, backup);

  // The confirmation dialog names the affected group, and the action is disabled.
  const confirm = page.getByRole('button', { name: 'Replace permanently' });
  await expect(page.getByText('Permanently replace these groups?')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Replace Gate Group' })).toBeVisible();
  await expect(confirm).toBeDisabled();

  // A near miss does not unlock it.
  await page.locator('#replace-confirm').fill('Replace Gate');
  await expect(confirm).toBeDisabled();

  // The exact group name does.
  await page.locator('#replace-confirm').fill('Replace Gate Group');
  await expect(confirm).toBeEnabled();

  // Cancelling leaves the data alone.
  await page.getByRole('button', { name: 'Cancel' }).click();
  const stillThere = await request.get(`/api/players/groups/${group.groupId}/players`);
  expect((await stillThere.json())).toHaveLength(2);
});

test('a version 1 backup cannot be used to replace', async ({ page, request }) => {
  const group = await seedGroup(request, 'Legacy Gate Group', ['Ana', 'Dave']);
  await selectGroupInBrowser(page, { id: group.groupId, name: 'Legacy Gate Group' });

  const legacyBackup = {
    version: '1.0.0',
    exportDate: '2026-06-01T00:00:00.000Z',
    data: {
      groups: [
        {
          id: group.groupId,
          name: 'Legacy Gate Group',
          defaultBuyIn: 100,
          currency: 'USD',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      players: [],
      sessions: [],
      entries: [],
    },
  };

  await page.goto('/settings');
  await page.getByRole('radio', { name: /Replace/ }).check();
  await chooseBackupFile(page, legacyBackup);

  await expect(page.getByText('This backup is too old to replace from')).toBeVisible();
  // No way to proceed — only Cancel is offered.
  await expect(page.getByRole('button', { name: 'Replace permanently' })).toHaveCount(0);
});

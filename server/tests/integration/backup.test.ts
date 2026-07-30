import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { backupService, BACKUP_VERSION } from '../../src/services/backupService';

/**
 * These tests exist because backup v1 was destructive: an export -> replace-restore
 * round trip permanently dropped rebuy events, player notes, templates, settlements
 * and session status, and resurrected soft-deleted sessions into live statistics.
 *
 * The round-trip test below is the regression net for all of that. If it passes,
 * a restore reproduces a group exactly.
 */

/**
 * Seed a group with one of everything that has ever been lost by a restore:
 * a completed session with settlements, an in-progress session, a soft-deleted
 * session, rebuy events, a player note, and a template.
 */
async function seedGroup(name: string) {
  const group = await prisma.group.create({
    data: { name, defaultBuyIn: 10, currency: 'EUR', userRole: 'VIEWER' },
  });

  const ana = await prisma.player.create({
    data: { groupId: group.id, name: `${name} Ana`, avatarUrl: 'https://example.test/a.png' },
  });
  const dave = await prisma.player.create({
    data: { groupId: group.id, name: `${name} Dave`, isActive: false },
  });

  const completed = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-05-01T00:00:00.000Z'),
      startTime: '19:30',
      endTime: '23:45',
      location: "Dave's place",
      notes: 'Ana ran hot',
      status: 'COMPLETED',
      completedAt: new Date('2026-05-01T23:45:00.000Z'),
      settlements: JSON.stringify([
        { from: `${name} Dave`, to: `${name} Ana`, amount: 25, paid: true },
      ]),
      entries: {
        create: [
          { playerId: ana.id, buyIn: 10, cashOut: 35 },
          { playerId: dave.id, buyIn: 30, cashOut: 5 },
        ],
      },
      rebuyEvents: {
        create: [
          { playerId: dave.id, amount: 10 },
          { playerId: dave.id, amount: 10 },
        ],
      },
    },
  });

  const inProgress = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-05-08T00:00:00.000Z'),
      startTime: '20:00',
      status: 'IN_PROGRESS',
      entries: { create: [{ playerId: ana.id, buyIn: 10, cashOut: 0 }] },
    },
  });

  const deleted = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-04-01T00:00:00.000Z'),
      status: 'COMPLETED',
      deletedAt: new Date('2026-04-02T00:00:00.000Z'),
      entries: {
        create: [
          { playerId: ana.id, buyIn: 10, cashOut: 0 },
          { playerId: dave.id, buyIn: 10, cashOut: 20 },
        ],
      },
    },
  });

  await prisma.playerNote.create({
    data: { playerId: dave.id, note: 'Calls too wide', tags: JSON.stringify(['leak']) },
  });

  await prisma.sessionTemplate.create({
    data: {
      groupId: group.id,
      name: `${name} Thursday`,
      location: "Dave's place",
      defaultTime: '19:30',
      playerIds: JSON.stringify([ana.id, dave.id]),
    },
  });

  return { group, ana, dave, completed, inProgress, deleted };
}

/** Full comparable snapshot of a group's rows, order-stable. */
async function snapshot(groupId: string) {
  const by = <T extends { id: string }>(rows: T[]) =>
    [...rows].sort((a, b) => a.id.localeCompare(b.id));

  return {
    group: await prisma.group.findUnique({ where: { id: groupId } }),
    players: by(await prisma.player.findMany({ where: { groupId } })),
    sessions: by(await prisma.session.findMany({ where: { groupId } })),
    entries: by(await prisma.sessionEntry.findMany({ where: { session: { groupId } } })),
    rebuyEvents: by(await prisma.rebuyEvent.findMany({ where: { session: { groupId } } })),
    playerNotes: by(await prisma.playerNote.findMany({ where: { player: { groupId } } })),
    templates: by(await prisma.sessionTemplate.findMany({ where: { groupId } })),
  };
}

describe('backup export', () => {
  it('includes every model, not just groups/players/sessions/entries', async () => {
    const { group } = await seedGroup('Export');

    const backup = await backupService.exportDatabase(group.id);

    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.data.groups).toHaveLength(1);
    expect(backup.data.players).toHaveLength(2);
    expect(backup.data.sessions).toHaveLength(3);
    expect(backup.data.entries).toHaveLength(5);
    expect(backup.data.rebuyEvents).toHaveLength(2);
    expect(backup.data.playerNotes).toHaveLength(1);
    expect(backup.data.templates).toHaveLength(1);
  });

  it('preserves session lifecycle fields that v1 dropped', async () => {
    const { group, completed, deleted, inProgress } = await seedGroup('Lifecycle');

    const backup = await backupService.exportDatabase(group.id);
    const find = (id: string) => backup.data.sessions.find((s: any) => s.id === id);

    expect(find(completed.id)).toMatchObject({ status: 'COMPLETED' });
    expect(find(completed.id).settlements).toContain('"paid":true');
    expect(find(completed.id).completedAt).not.toBeNull();
    expect(find(inProgress.id)).toMatchObject({ status: 'IN_PROGRESS' });
    expect(find(deleted.id).deletedAt).not.toBeNull();
  });

  it('scopes to one group, leaving other groups out of the file', async () => {
    const a = await seedGroup('Alpha');
    await seedGroup('Bravo');

    const backup = await backupService.exportDatabase(a.group.id);

    expect(backup.data.groups.map((g: any) => g.id)).toEqual([a.group.id]);
    expect(backup.scope?.groupIds).toEqual([a.group.id]);
    expect(backup.data.players.every((p: any) => p.groupId === a.group.id)).toBe(true);
    expect(backup.data.sessions.every((s: any) => s.groupId === a.group.id)).toBe(true);
    expect(backup.data.playerNotes).toHaveLength(1);
  });

  it('exports every group when no groupId is given', async () => {
    await seedGroup('One');
    await seedGroup('Two');

    const backup = await backupService.exportDatabase();

    expect(backup.data.groups).toHaveLength(2);
    expect(backup.data.rebuyEvents).toHaveLength(4);
  });

  it('is reachable over HTTP at both /export and /export/:groupId', async () => {
    const { group } = await seedGroup('Http');

    const all = await request(app).get('/api/backup/export');
    const scoped = await request(app).get(`/api/backup/export/${group.id}`);

    expect(all.status).toBe(200);
    expect(scoped.status).toBe(200);
    expect(scoped.body.data.groups).toHaveLength(1);
    expect(scoped.headers['content-disposition']).toContain(group.id);
  });
});

describe('backup round trip', () => {
  it('restores a group byte-for-byte after a full wipe', async () => {
    const { group } = await seedGroup('RoundTrip');
    const before = await snapshot(group.id);

    const backup = await backupService.exportDatabase(group.id);

    // Simulate total loss.
    await prisma.rebuyEvent.deleteMany();
    await prisma.sessionEntry.deleteMany();
    await prisma.playerNote.deleteMany();
    await prisma.sessionTemplate.deleteMany();
    await prisma.session.deleteMany();
    await prisma.player.deleteMany();
    await prisma.group.deleteMany();

    const report = await backupService.importDatabase(backup, {
      mode: 'merge',
      skipDuplicates: false,
    });
    expect(report.errors).toEqual([]);
    expect(report.success).toBe(true);

    const after = await snapshot(group.id);
    expect(after).toEqual(before);
  });

  it('keeps soft-deleted sessions deleted instead of resurrecting them', async () => {
    const { group, deleted } = await seedGroup('SoftDelete');
    const backup = await backupService.exportDatabase(group.id);

    await prisma.rebuyEvent.deleteMany();
    await prisma.sessionEntry.deleteMany();
    await prisma.playerNote.deleteMany();
    await prisma.sessionTemplate.deleteMany();
    await prisma.session.deleteMany();
    await prisma.player.deleteMany();
    await prisma.group.deleteMany();

    await backupService.importDatabase(backup, { mode: 'merge', skipDuplicates: false });

    const restored = await prisma.session.findUnique({ where: { id: deleted.id } });
    expect(restored?.deletedAt).not.toBeNull();

    // And it must stay out of the live set.
    const live = await prisma.session.findMany({ where: { groupId: group.id, deletedAt: null } });
    expect(live.map((s) => s.id)).not.toContain(deleted.id);
  });

  it('restores rebuy events, notes and templates that v1 silently destroyed', async () => {
    const { group } = await seedGroup('Complete');
    const backup = await backupService.exportDatabase(group.id);

    await prisma.rebuyEvent.deleteMany();
    await prisma.playerNote.deleteMany();
    await prisma.sessionTemplate.deleteMany();

    const report = await backupService.importDatabase(backup, {
      mode: 'merge',
      skipDuplicates: false,
    });

    expect(report.imported.rebuyEvents).toBe(2);
    expect(report.imported.playerNotes).toBe(1);
    expect(report.imported.templates).toBe(1);
    expect(await prisma.rebuyEvent.count()).toBe(2);
    expect(await prisma.playerNote.count()).toBe(1);
    expect(await prisma.sessionTemplate.count()).toBe(1);
  });
});

describe('replace mode is scoped to the backup', () => {
  it('leaves other groups completely untouched', async () => {
    const a = await seedGroup('Target');
    const b = await seedGroup('Bystander');

    const bBefore = await snapshot(b.group.id);
    const backup = await backupService.exportDatabase(a.group.id);

    const report = await backupService.importDatabase(backup, {
      mode: 'replace',
      skipDuplicates: false,
    });

    expect(report.errors).toEqual([]);
    expect(await snapshot(b.group.id)).toEqual(bBefore);
  });

  it('still fully restores the targeted group', async () => {
    const a = await seedGroup('Target');
    await seedGroup('Bystander');

    const before = await snapshot(a.group.id);
    const backup = await backupService.exportDatabase(a.group.id);

    await backupService.importDatabase(backup, { mode: 'replace', skipDuplicates: false });

    expect(await snapshot(a.group.id)).toEqual(before);
  });

  it('removes rows in the targeted group that are absent from the backup', async () => {
    const a = await seedGroup('Target');
    const backup = await backupService.exportDatabase(a.group.id);

    // A session recorded after the backup was taken should not survive a replace.
    const later = await prisma.session.create({
      data: { groupId: a.group.id, date: new Date('2026-06-01T00:00:00.000Z'), status: 'COMPLETED' },
    });

    await backupService.importDatabase(backup, { mode: 'replace', skipDuplicates: false });

    expect(await prisma.session.findUnique({ where: { id: later.id } })).toBeNull();
  });

  it('refuses a replace from a backup that names no groups', async () => {
    await seedGroup('Bystander');

    const report = await backupService.importDatabase(
      {
        version: BACKUP_VERSION,
        exportDate: new Date().toISOString(),
        data: {
          groups: [],
          players: [],
          sessions: [],
          entries: [],
          rebuyEvents: [],
          playerNotes: [],
          templates: [],
        },
      },
      { mode: 'replace', skipDuplicates: false }
    );

    expect(report.success).toBe(false);
    expect(report.errors.join(' ')).toMatch(/no groups/i);
    // The bystander group survives — this is the old deleteMany({}) wipe.
    expect(await prisma.group.count()).toBe(1);
  });
});

describe('legacy v1 backups', () => {
  const legacyFile = (groupId: string, playerId: string) => ({
    version: '1.0.0',
    exportDate: '2026-06-01T00:00:00.000Z',
    data: {
      groups: [
        {
          id: groupId,
          name: 'Legacy Group',
          defaultBuyIn: 5,
          currency: 'USD',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      players: [
        {
          id: playerId,
          groupId,
          name: 'Legacy Player',
          avatarUrl: null,
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      sessions: [],
      entries: [],
    },
  });

  it('imports in merge mode without crashing', async () => {
    const report = await backupService.importDatabase(
      legacyFile('legacy-group', 'legacy-player') as any,
      { mode: 'merge', skipDuplicates: false }
    );

    expect(report.success).toBe(true);
    expect(report.imported.groups).toBe(1);
    expect(report.imported.players).toBe(1);
  });

  it('is refused in replace mode — it cannot restore what the delete would remove', async () => {
    const existing = await seedGroup('Existing');

    const report = await backupService.importDatabase(
      legacyFile(existing.group.id, 'legacy-player') as any,
      { mode: 'replace', skipDuplicates: false }
    );

    expect(report.success).toBe(false);
    expect(report.errors.join(' ')).toMatch(/version 1 backup/i);
    // Nothing was deleted.
    expect(await prisma.rebuyEvent.count()).toBe(2);
    expect(await prisma.playerNote.count()).toBe(1);
  });
});

describe('merge mode', () => {
  it('skips existing rows when skipDuplicates is set', async () => {
    const { group } = await seedGroup('Merge');
    const backup = await backupService.exportDatabase(group.id);

    const report = await backupService.importDatabase(backup, {
      mode: 'merge',
      skipDuplicates: true,
    });

    expect(report.skipped.groups).toBe(1);
    expect(report.skipped.rebuyEvents).toBe(2);
    expect(report.imported.groups).toBe(0);
  });

  it('updates existing rows when skipDuplicates is not set', async () => {
    const { group } = await seedGroup('Overwrite');
    const backup = await backupService.exportDatabase(group.id);

    await prisma.group.update({ where: { id: group.id }, data: { name: 'Renamed' } });

    await backupService.importDatabase(backup, { mode: 'merge', skipDuplicates: false });

    const restored = await prisma.group.findUnique({ where: { id: group.id } });
    expect(restored?.name).toBe(group.name);
  });
});

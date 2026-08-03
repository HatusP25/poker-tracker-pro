import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

/**
 * Seasons are additive: a group that defines none behaves exactly as it did when
 * Season Recap was hardcoded to the calendar year.
 */

async function seedGroup() {
  const group = await prisma.group.create({ data: { name: 'Season Group', defaultBuyIn: 5 } });
  const ana = await prisma.player.create({ data: { groupId: group.id, name: 'Ana' } });
  const dave = await prisma.player.create({ data: { groupId: group.id, name: 'Dave' } });
  return { group, ana, dave };
}

/** A completed night on a given date, with `winner` up by `amount`. */
async function night(
  groupId: string,
  date: string,
  winner: string,
  loser: string,
  amount = 20
) {
  return prisma.session.create({
    data: {
      groupId,
      date: new Date(`${date}T12:00:00.000Z`),
      status: 'COMPLETED',
      entries: {
        create: [
          { playerId: winner, buyIn: 20, cashOut: 20 + amount },
          { playerId: loser, buyIn: 20, cashOut: 20 - amount },
        ],
      },
    },
  });
}

const makeSeason = (groupId: string, name: string, startDate: string, endDate: string) =>
  request(app).post('/api/seasons').send({ groupId, name, startDate, endDate });

describe('season CRUD', () => {
  it('creates a season', async () => {
    const { group } = await seedGroup();
    const res = await makeSeason(group.id, 'Season 1', '2026-03-01', '2026-05-31');

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Season 1');
  });

  it('includes the closing day, so a night played on it counts', async () => {
    const { group } = await seedGroup();
    const res = await makeSeason(group.id, 'Season 1', '2026-03-01', '2026-05-31');

    // UTC-anchored to match how session dates are stored, so the ISO date part
    // stays on the intended day for every client that reads it.
    expect(res.body.endDate).toBe('2026-05-31T23:59:59.999Z');
    expect(res.body.startDate).toBe('2026-03-01T00:00:00.000Z');
  });

  it('rejects a range that ends before it starts', async () => {
    const { group } = await seedGroup();
    const res = await makeSeason(group.id, 'Backwards', '2026-05-31', '2026-03-01');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/on or after/i);
  });

  it('rejects a season that overlaps an existing one', async () => {
    const { group } = await seedGroup();
    await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');

    const res = await makeSeason(group.id, 'Clash', '2026-05-01', '2026-07-01');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/overlaps "Spring"/);
  });

  it('rejects an overlap of a single shared day', async () => {
    const { group } = await seedGroup();
    await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');

    const res = await makeSeason(group.id, 'Summer', '2026-05-31', '2026-08-31');
    expect(res.status).toBe(400);
  });

  it('allows back-to-back seasons', async () => {
    const { group } = await seedGroup();
    await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');

    const res = await makeSeason(group.id, 'Summer', '2026-06-01', '2026-08-31');
    expect(res.status).toBe(201);
  });

  it('rejects a too-short name', async () => {
    const { group } = await seedGroup();
    const res = await makeSeason(group.id, 'x', '2026-03-01', '2026-05-31');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 2 characters/i);
  });

  it('lists a group’s seasons newest first', async () => {
    const { group } = await seedGroup();
    await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');
    await makeSeason(group.id, 'Summer', '2026-06-01', '2026-08-31');

    const res = await request(app).get(`/api/seasons/groups/${group.id}/seasons`);
    expect(res.body.map((s: any) => s.name)).toEqual(['Summer', 'Spring']);
  });

  it('lets a season be renamed without tripping its own overlap check', async () => {
    const { group } = await seedGroup();
    const created = await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');

    const res = await request(app)
      .patch(`/api/seasons/${created.body.id}`)
      .send({ name: 'Spring 2026' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Spring 2026');
  });

  it('still catches an edit that collides with a different season', async () => {
    const { group } = await seedGroup();
    const spring = await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');
    await makeSeason(group.id, 'Summer', '2026-06-01', '2026-08-31');

    const res = await request(app)
      .patch(`/api/seasons/${spring.body.id}`)
      .send({ endDate: '2026-07-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/overlaps "Summer"/);
  });

  it('deleting a season removes only the label, never the poker data', async () => {
    const { group, ana, dave } = await seedGroup();
    const created = await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');
    await night(group.id, '2026-04-01', ana.id, dave.id);

    const before = await prisma.sessionEntry.count();
    const res = await request(app).delete(`/api/seasons/${created.body.id}`);

    expect(res.status).toBe(204);
    expect(await prisma.session.count()).toBe(1);
    expect(await prisma.sessionEntry.count()).toBe(before);
  });

  it('reports the season covering today, and null between seasons', async () => {
    const { group } = await seedGroup();
    const year = new Date().getFullYear();
    await makeSeason(group.id, 'Now', `${year}-01-01`, `${year}-12-31`);

    const current = await request(app).get(`/api/seasons/groups/${group.id}/seasons/current`);
    expect(current.body?.name).toBe('Now');

    const other = await seedGroup();
    const none = await request(app).get(`/api/seasons/groups/${other.group.id}/seasons/current`);
    expect(none.body).toBeNull();
  });
});

describe('season recap', () => {
  it('covers exactly the nights inside the season', async () => {
    const { group, ana, dave } = await seedGroup();
    const season = await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');

    await night(group.id, '2026-02-20', ana.id, dave.id); // before
    await night(group.id, '2026-04-01', ana.id, dave.id); // inside
    await night(group.id, '2026-05-31', ana.id, dave.id); // closing day, inside
    await night(group.id, '2026-06-05', ana.id, dave.id); // after

    const res = await request(app).get(
      `/api/stats/groups/${group.id}/season?seasonId=${season.body.id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.totalSessions).toBe(2);
    expect(res.body.period).toBe('Spring');
  });

  it('crowns the champion of that season', async () => {
    const { group, ana, dave } = await seedGroup();
    const season = await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');
    await night(group.id, '2026-04-01', dave.id, ana.id, 30);

    const res = await request(app).get(
      `/api/stats/groups/${group.id}/season?seasonId=${season.body.id}`
    );
    expect(res.body.champion.playerName).toBe('Dave');
  });

  it('compares biggest mover against the previous season, not the previous year', async () => {
    const { group, ana, dave } = await seedGroup();
    await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');
    const summer = await makeSeason(group.id, 'Summer', '2026-06-01', '2026-08-31');

    // Ana dominates spring, Dave takes over in summer -> Dave is the mover.
    await night(group.id, '2026-04-01', ana.id, dave.id, 50);
    await night(group.id, '2026-07-01', dave.id, ana.id, 50);

    const res = await request(app).get(
      `/api/stats/groups/${group.id}/season?seasonId=${summer.body.id}`
    );
    expect(res.body.biggestMover?.playerName).toBe('Dave');
  });

  it('has no biggest mover for a group’s first season', async () => {
    const { group, ana, dave } = await seedGroup();
    const season = await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');
    await night(group.id, '2026-04-01', ana.id, dave.id);

    const res = await request(app).get(
      `/api/stats/groups/${group.id}/season?seasonId=${season.body.id}`
    );
    expect(res.body.biggestMover).toBeNull();
  });

  it('rejects a season belonging to another group', async () => {
    const a = await seedGroup();
    const b = await seedGroup();
    const season = await makeSeason(b.group.id, 'Theirs', '2026-03-01', '2026-05-31');

    const res = await request(app).get(
      `/api/stats/groups/${a.group.id}/season?seasonId=${season.body.id}`
    );
    expect(res.status).toBe(400);
  });

  it('still falls back to the calendar year when no season is requested', async () => {
    const { group, ana, dave } = await seedGroup();
    await night(group.id, '2026-04-01', ana.id, dave.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/season?year=2026`);
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('2026');
    expect(res.body.totalSessions).toBe(1);
  });
});

describe('seasons in backups', () => {
  it('round-trip through a backup without losing the season', async () => {
    const { group } = await seedGroup();
    await makeSeason(group.id, 'Spring', '2026-03-01', '2026-05-31');

    const backup = await request(app).get(`/api/backup/export/${group.id}`);
    expect(backup.body.data.seasons).toHaveLength(1);

    await prisma.season.deleteMany();
    await request(app)
      .post('/api/backup/import')
      .send({ backup: backup.body, options: { mode: 'merge', skipDuplicates: false } });

    const restored = await prisma.season.findFirst();
    expect(restored?.name).toBe('Spring');
  });

  it('a scoped replace removes only the target group’s seasons', async () => {
    const a = await seedGroup();
    const b = await seedGroup();
    await makeSeason(a.group.id, 'A Season', '2026-03-01', '2026-05-31');
    await makeSeason(b.group.id, 'B Season', '2026-03-01', '2026-05-31');

    const backup = await request(app).get(`/api/backup/export/${a.group.id}`);
    await request(app)
      .post('/api/backup/import')
      .send({ backup: backup.body, options: { mode: 'replace', skipDuplicates: false } });

    const names = (await prisma.season.findMany()).map((s) => s.name).sort();
    expect(names).toEqual(['A Season', 'B Season']);
  });
});

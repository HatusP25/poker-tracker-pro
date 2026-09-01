import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

/**
 * GET /api/stats/groups/:groupId/angles — the whole derived-metrics matrix in one
 * full-history pass, end to end (route -> controller -> service -> DB).
 */

async function seed() {
  const group = await prisma.group.create({
    data: { name: 'Angles Test Group', defaultBuyIn: 10 },
  });
  const alice = await prisma.player.create({ data: { groupId: group.id, name: 'Alice' } });
  const bob = await prisma.player.create({ data: { groupId: group.id, name: 'Bob' } });
  const ghost = await prisma.player.create({ data: { groupId: group.id, name: 'Ghost' } });

  // Four Fridays at two venues. Alice wins every one; Bob loses every one and
  // rebuys $10 a night (recorded live on the first, implied by the buy-in after).
  const dates = ['2026-01-02', '2026-01-09', '2026-01-16', '2026-01-23'];
  const sessions = [];
  for (const [i, date] of dates.entries()) {
    const session = await prisma.session.create({
      data: {
        groupId: group.id,
        date: new Date(date),
        status: 'COMPLETED',
        location: i % 2 === 0 ? "Sam's Place" : 'The Pub',
        entries: {
          create: [
            { playerId: alice.id, buyIn: 10, cashOut: 30 },
            {
              playerId: bob.id,
              buyIn: 20,
              cashOut: 0,
              // Bob ducks out early on the last two nights.
              cashedOutAt: i >= 2 ? new Date(date) : null,
            },
          ],
        },
      },
    });
    if (i === 0) {
      await prisma.rebuyEvent.create({
        data: { sessionId: session.id, playerId: bob.id, amount: 10 },
      });
    }
    sessions.push(session);
  }

  // Tonight, still running — must be invisible to every angle.
  await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-01-30'),
      status: 'IN_PROGRESS',
      entries: { create: [{ playerId: alice.id, buyIn: 500, cashOut: 0 }] },
    },
  });

  return { group, alice, bob, ghost };
}

describe('GET /api/stats/groups/:groupId/angles', () => {
  it('returns the whole matrix for one group in a single request', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);

    expect(res.status).toBe(200);
    expect(res.body.groupId).toBe(group.id);
    expect(res.body.totalSessions).toBe(4); // the live night is excluded
    expect(res.body.firstSessionDate).toBe(new Date('2026-01-02').toISOString());
    expect(res.body.lastSessionDate).toBe(new Date('2026-01-23').toISOString());
    expect(res.body.thresholds.splitMinSessions).toBeGreaterThan(0);
  });

  it('includes every group member, including one who has never played', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);

    const names = res.body.players.map((p: any) => p.playerName).sort();
    expect(names).toEqual(['Alice', 'Bob', 'Ghost']);

    const ghost = res.body.players.find((p: any) => p.playerName === 'Ghost');
    expect(ghost.games).toBe(0);
    expect(ghost.angles).toHaveLength(1);
    expect(ghost.angles[0].id).toBe('never-played');
  });

  it('gives every player at least one angle', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);
    for (const p of res.body.players) {
      expect(p.angles.length).toBeGreaterThan(0);
      expect(p.angles[0].score).toBeGreaterThan(0);
    }
  });

  it('reports the day-of-week bucket in UTC', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);
    const alice = res.body.players.find((p: any) => p.playerName === 'Alice');
    expect(alice.splits.dayOfWeek.buckets.map((b: any) => b.key)).toEqual(['FRI']);
    expect(alice.splits.dayOfWeek.buckets[0].sessions).toBe(4);
  });

  it('groups venues case-insensitively and reports profit per venue', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);
    const alice = res.body.players.find((p: any) => p.playerName === 'Alice');
    const keys = alice.splits.venue.buckets.map((b: any) => b.key).sort();
    expect(keys).toEqual(["sam's place", 'the pub']);
    expect(alice.splits.venue.buckets.every((b: any) => b.avgProfit === 20)).toBe(true);
  });

  it('exposes rebuy dollars from RebuyEvent rows, recorded or reconstructed', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);
    const bob = res.body.players.find((p: any) => p.playerName === 'Bob');
    // $10 recorded on night one, $10 reconstructed from a $20 buy-in on each of
    // the other three at a $10 default.
    expect(bob.rebuys.count).toBe(4);
    expect(bob.rebuys.totalAmount).toBe(40);
    expect(bob.rebuys.avgPerNight).toBe(10);
  });

  it('reports attendance against the nights each player could have attended', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);
    const alice = res.body.players.find((p: any) => p.playerName === 'Alice');
    expect(alice.attendance).toMatchObject({
      played: 4,
      eligible: 4,
      attendanceRate: 100,
      currentStreak: 4,
      missedInARow: 0,
    });
  });

  it('reports droughts and never-won honestly', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);
    const bob = res.body.players.find((p: any) => p.playerName === 'Bob');
    expect(bob.drought).toMatchObject({ hasEverWon: false, nightsSinceLastWin: null });
    expect(bob.angles.map((a: any) => a.id)).toContain('never-won');
  });

  it('scopes early departures to the nights where exits were actually tracked', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);
    const bob = res.body.players.find((p: any) => p.playerName === 'Bob');
    expect(bob.departures).toMatchObject({ trackedSessions: 2, earlyExits: 2, meaningful: false });
    const alice = res.body.players.find((p: any) => p.playerName === 'Alice');
    expect(alice.departures).toMatchObject({ trackedSessions: 2, earlyExits: 0 });
  });

  it('ranks each night inside that player\'s own career', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);
    const alice = res.body.players.find((p: any) => p.playerName === 'Alice');
    expect(alice.bestNights).toHaveLength(3);
    expect(alice.bestNights[0]).toMatchObject({ rank: 1, outOf: 4, profit: 20 });
    expect(alice.latestNight).toMatchObject({ outOf: 4 });
  });

  it('returns the whole co-attendance matrix, not just its maximum', async () => {
    const { group, alice, bob } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);
    expect(res.body.coAttendance).toEqual([
      expect.objectContaining({
        playerAId: expect.any(String),
        playerBId: expect.any(String),
        sharedSessions: 4,
      }),
    ]);
    const ids = [res.body.coAttendance[0].playerAId, res.body.coAttendance[0].playerBId].sort();
    expect(ids).toEqual([alice.id, bob.id].sort());
  });

  it('surfaces nemesis and favourite victim, which were computed but never reachable', async () => {
    const { group, alice, bob } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);

    const bobRow = res.body.players.find((p: any) => p.playerName === 'Bob');
    expect(bobRow.rivalries.nemesis).toMatchObject({
      playerId: alice.id,
      losses: 4,
      sharedSessions: 4,
      dominance: 100,
    });

    const aliceRow = res.body.players.find((p: any) => p.playerName === 'Alice');
    expect(aliceRow.rivalries.favouriteVictim).toMatchObject({ playerId: bob.id, wins: 4 });
    expect(aliceRow.rivalries.mostPlayedWith.sharedSessions).toBe(4);
  });

  it('is well-formed for a group that has never played a night', async () => {
    const group = await prisma.group.create({ data: { name: 'Fresh Group', defaultBuyIn: 5 } });
    await prisma.player.create({ data: { groupId: group.id, name: 'Solo' } });

    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);

    expect(res.status).toBe(200);
    expect(res.body.totalSessions).toBe(0);
    expect(res.body.firstSessionDate).toBeNull();
    expect(res.body.coAttendance).toEqual([]);
    expect(res.body.splits.venue.buckets).toEqual([]);
    expect(res.body.players[0].angles[0].id).toBe('never-played');
  });

  it('returns an empty, well-formed payload for an unknown group rather than erroring', async () => {
    const res = await request(app).get('/api/stats/groups/does-not-exist/angles');
    expect(res.status).toBe(200);
    expect(res.body.players).toEqual([]);
    expect(res.body.totalSessions).toBe(0);
  });
});

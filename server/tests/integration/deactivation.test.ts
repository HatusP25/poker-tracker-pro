import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

/**
 * F-14: a deactivated player is absent from every derived surface, and fully
 * present in the record of every night they actually played.
 *
 * Seed shape: Carol wins the most recent night outright, so she holds the belt
 * and tops the leaderboard while active. Deactivating her must move both.
 *
 * `tests/integration/setup.ts` truncates every table before each test, so each
 * case seeds its own data.
 */
async function seed() {
  const group = await prisma.group.create({
    data: { name: 'Deactivation Test Group', defaultBuyIn: 10 },
  });

  const alice = await prisma.player.create({
    data: { groupId: group.id, name: 'Alice' },
  });
  const bob = await prisma.player.create({
    data: { groupId: group.id, name: 'Bob' },
  });
  const carol = await prisma.player.create({
    data: { groupId: group.id, name: 'Carol' },
  });

  const night1 = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-03-01T00:00:00.000Z'),
      status: 'COMPLETED',
      completedAt: new Date('2026-03-01T00:00:00.000Z'),
      entries: {
        create: [
          { playerId: alice.id, buyIn: 10, cashOut: 25 },
          { playerId: bob.id, buyIn: 10, cashOut: 5 },
          { playerId: carol.id, buyIn: 10, cashOut: 0 },
        ],
      },
    },
  });

  // Carol takes the most recent night by a wide margin.
  const night2 = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-04-01T00:00:00.000Z'),
      status: 'COMPLETED',
      completedAt: new Date('2026-04-01T00:00:00.000Z'),
      entries: {
        create: [
          { playerId: alice.id, buyIn: 10, cashOut: 2 },
          { playerId: bob.id, buyIn: 10, cashOut: 8 },
          { playerId: carol.id, buyIn: 10, cashOut: 20 },
        ],
      },
    },
  });

  return { group, alice, bob, carol, night1, night2 };
}

const deactivate = (playerId: string) =>
  request(app).patch(`/api/players/${playerId}/toggle-active`);

describe('F-14 deactivated player visibility', () => {
  it('removes a deactivated player from the leaderboard', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/leaderboard`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((e: any) => e.playerName)).not.toContain('Carol');
  });

  it('re-ranks the remaining players contiguously from 1', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/leaderboard`);

    expect(res.body.map((e: any) => e.rank)).toEqual([1, 2]);
  });

  it('passes the belt to the most recent active winner', async () => {
    const { group, carol } = await seed();

    const before = await request(app).get(`/api/stats/groups/${group.id}/belt`);
    expect(before.body.current.playerName).toBe('Carol');

    await deactivate(carol.id);

    const after = await request(app).get(`/api/stats/groups/${group.id}/belt`);
    expect(after.body.current.playerName).toBe('Bob');
  });

  it('drops the deactivated player from records, recap and achievements', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);

    for (const path of ['records', 'season?year=2026', 'achievements']) {
      const res = await request(app).get(`/api/stats/groups/${group.id}/${path}`);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('Carol');
    }
  });

  it('keeps the session they played intact and still balanced', async () => {
    const { carol, night2 } = await seed();
    await deactivate(carol.id);

    const session = await request(app).get(`/api/sessions/${night2.id}`);
    expect(session.body.entries.map((e: any) => e.player.name)).toContain('Carol');

    const balance = await request(app).get(`/api/stats/sessions/${night2.id}/balance-check`);
    expect(balance.body.isBalanced).toBe(true);
  });

  it('keeps night-level totals whole but reports an active-only winner', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/dashboard`);

    // D-B: the night had three players and a $30 pot, and still does.
    const latest = res.body.recentSessions[0];
    expect(latest.playerCount).toBe(3);
    expect(latest.totalPot).toBe(30);
    // Carol actually won that night, but the callout is active-only.
    expect(latest.winner).toBe('Bob');
    // The counter the Dashboard actually renders.
    expect(res.body.activePlayers).toBe(2);
  });

  it('returns a null winner for a night only deactivated players played', async () => {
    const { group, carol } = await seed();
    await prisma.session.create({
      data: {
        groupId: group.id,
        date: new Date('2026-05-01T00:00:00.000Z'),
        status: 'COMPLETED',
        completedAt: new Date('2026-05-01T00:00:00.000Z'),
        entries: { create: [{ playerId: carol.id, buyIn: 10, cashOut: 10 }] },
      },
    });
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/dashboard`);

    // Must not throw, and names nobody.
    expect(res.status).toBe(200);
    expect(res.body.recentSessions[0].winner).toBe('');
    // D-B: the night itself still counts, with its real pot.
    expect(res.body.recentSessions[0].playerCount).toBe(1);
    expect(res.body.recentSessions[0].totalPot).toBe(10);
  });

  it('drops the deactivated player from the angles payload', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);

    expect(res.status).toBe(200);
    expect(res.body.players.map((p: any) => p.playerName)).not.toContain('Carol');
    // Rivalries and the co-attendance grid are pair surfaces: no pair may name her.
    expect(JSON.stringify(res.body.coAttendance)).not.toContain(carol.id);
    expect(JSON.stringify(res.body.players)).not.toContain(carol.id);
  });

  it('keeps the group night count whole in the angles payload', async () => {
    // A night only departed players attended still happened, so it stays in the
    // denominator every attendance rate is measured against (D-B).
    const { group, carol } = await seed();
    await prisma.session.create({
      data: {
        groupId: group.id,
        date: new Date('2026-05-01T00:00:00.000Z'),
        status: 'COMPLETED',
        completedAt: new Date('2026-05-01T00:00:00.000Z'),
        entries: { create: [{ playerId: carol.id, buyIn: 10, cashOut: 10 }] },
      },
    });
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/angles`);

    expect(res.body.totalSessions).toBe(3);
  });

  it('splits the session summary per D-D', async () => {
    const { group, carol, night2 } = await seed();
    await deactivate(carol.id);

    const res = await request(app).get(
      `/api/stats/sessions/${night2.id}/summary?groupId=${group.id}`
    );

    expect(res.status).toBe(200);
    // Cross-night rules are derived surfaces: Carol is absent, and crucially
    // does not appear as a rank-0 "brand new player" row.
    expect(res.body.rankingChanges.map((c: any) => c.playerName)).not.toContain('Carol');
    expect(res.body.rankingChanges.every((c: any) => c.newRank > 0)).toBe(true);
    expect(res.body.streaks.map((s: any) => s.playerName)).not.toContain('Carol');
    // The night's own facts stay whole.
    expect(res.body.session.playerCount).toBe(3);
    expect(res.body.session.totalPot).toBe(30);
  });

  it('restores every surface when the player is reactivated', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);
    await deactivate(carol.id); // toggle back

    const [leaderboard, belt] = await Promise.all([
      request(app).get(`/api/stats/groups/${group.id}/leaderboard`),
      request(app).get(`/api/stats/groups/${group.id}/belt`),
    ]);

    expect(leaderboard.body.map((e: any) => e.playerName)).toContain('Carol');
    expect(belt.body.current.playerName).toBe('Carol');
  });
});

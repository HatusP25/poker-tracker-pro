import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

/**
 * An in-progress session has `cashOut = 0` for everyone still at the table. Nothing
 * in the stats path filtered on status, so the moment a live night started, every
 * player at it showed as a total loss in the leaderboard, player stats, dashboard,
 * streaks, records, form and the season recap.
 *
 * These tests pin the fix end to end: a live night must be invisible to every
 * group-history surface, while single-session endpoints (which are asked about that
 * specific session) must still see it.
 */

async function seed() {
  const group = await prisma.group.create({
    data: { name: 'In-Progress Test Group', defaultBuyIn: 10 },
  });
  const alice = await prisma.player.create({ data: { groupId: group.id, name: 'Alice' } });
  const bob = await prisma.player.create({ data: { groupId: group.id, name: 'Bob' } });

  // One finished night: Alice +40, Bob -40.
  const completed = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-01-05'),
      status: 'COMPLETED',
      entries: {
        create: [
          { playerId: alice.id, buyIn: 10, cashOut: 50 },
          { playerId: bob.id, buyIn: 50, cashOut: 10 },
        ],
      },
    },
  });

  // Tonight, still running: both are $100 deep with nothing cashed out.
  const live = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-02-09'),
      status: 'IN_PROGRESS',
      entries: {
        create: [
          { playerId: alice.id, buyIn: 100, cashOut: 0 },
          { playerId: bob.id, buyIn: 100, cashOut: 0 },
        ],
      },
    },
  });

  return { group, alice, bob, completed, live };
}

describe('in-progress sessions are excluded from group statistics', () => {
  it('leaderboard ignores the live night', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/leaderboard`);

    expect(res.status).toBe(200);
    const alice = res.body.find((e: any) => e.playerName === 'Alice');
    const bob = res.body.find((e: any) => e.playerName === 'Bob');
    expect(alice).toMatchObject({ totalGames: 1, balance: 40, rank: 1 });
    expect(bob).toMatchObject({ totalGames: 1, balance: -40, rank: 2 });
  });

  it('player stats ignore the live night', async () => {
    const { alice } = await seed();
    const res = await request(app).get(`/api/stats/players/${alice.id}/stats`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalGames: 1,
      totalBuyIn: 10,
      balance: 40,
      worstSession: 40,
      currentStreak: { type: 'win', count: 1 },
    });
  });

  it('dashboard counts only completed sessions', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/dashboard`);

    expect(res.status).toBe(200);
    expect(res.body.totalSessions).toBe(1);
    expect(res.body.recentSessions).toHaveLength(1);
    expect(res.body.recentSessions[0].winner).toBe('Alice');
    expect(res.body.avgSessionSize).toBe(60);
  });

  it('streaks ignore the live night', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/streaks`);

    expect(res.status).toBe(200);
    const alice = res.body.find((e: any) => e.playerName === 'Alice');
    expect(alice).toMatchObject({ currentStreak: 1, streakType: 'win' });
  });

  it('performance trend ignores the live night', async () => {
    const { alice } = await seed();
    const res = await request(app).get(`/api/stats/players/${alice.id}/performance-trend`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ sessionProfit: 40, cumulativeProfit: 40 });
  });

  it('records ignore the live night', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/records`);

    expect(res.status).toBe(200);
    expect(res.body.biggestLoss).toMatchObject({ playerName: 'Bob', value: -40 });
    expect(res.body.biggestPot.total).toBe(60);
  });

  it('form ignores the live night', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/form`);

    expect(res.status).toBe(200);
    const alice = res.body.find((e: any) => e.playerName === 'Alice');
    expect(alice.recentResults).toEqual([40]);
    expect(alice.recentGames).toBe(1);
  });

  it('head-to-head ignores the live night', async () => {
    const { group, alice, bob } = await seed();
    const res = await request(app).get(
      `/api/stats/groups/${group.id}/head-to-head?playerA=${alice.id}&playerB=${bob.id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.pair).toMatchObject({ sharedSessions: 1, aWins: 1, bWins: 0, ties: 0 });
  });

  it('season recap ignores the live night', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/season?year=2026`);

    expect(res.status).toBe(200);
    expect(res.body.totalSessions).toBe(1);
    expect(res.body.totalPot).toBe(60);
    expect(res.body.champion).toMatchObject({ playerName: 'Alice', value: 40 });
  });

  it('still reports stats for the live session itself when asked directly', async () => {
    const { live } = await seed();

    const stats = await request(app).get(`/api/stats/sessions/${live.id}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body.playerCount).toBe(2);
    expect(stats.body.totalBuyIn).toBe(200);

    const balance = await request(app).get(`/api/stats/sessions/${live.id}/balance-check`);
    expect(balance.status).toBe(200);
    expect(balance.body.difference).toBe(-200);
  });
});

describe('a session with no entries', () => {
  it('does not crash the dashboard', async () => {
    const group = await prisma.group.create({
      data: { name: 'Empty Session Group', defaultBuyIn: 10 },
    });
    await prisma.session.create({
      data: { groupId: group.id, date: new Date('2026-03-01'), status: 'COMPLETED' },
    });

    const res = await request(app).get(`/api/stats/groups/${group.id}/dashboard`);

    expect(res.status).toBe(200);
    expect(res.body.totalSessions).toBe(1);
    expect(res.body.recentSessions[0]).toMatchObject({ playerCount: 0, winner: '', totalPot: 0 });
  });
});

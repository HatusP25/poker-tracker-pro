import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

// These tests exercise GET /api/stats/groups/:groupId/leaderboard's `timeframe`
// query param end to end (route -> controller -> statsService -> DB). Session
// dates are computed relative to the real wall clock (mirroring the boundary
// logic in getTimeframeStart) so the tests are not tied to a fixed calendar date.

async function seedGroupWithPlayer() {
  const group = await prisma.group.create({
    data: { name: 'Leaderboard Timeframe Test Group', defaultBuyIn: 10 },
  });
  const alice = await prisma.player.create({ data: { groupId: group.id, name: 'Alice' } });
  return { group, alice };
}

async function createSession(groupId: string, playerId: string, date: Date, profit: number) {
  const buyIn = 10;
  const cashOut = buyIn + profit;
  return prisma.session.create({
    data: {
      groupId,
      date,
      status: 'COMPLETED',
      entries: {
        create: [{ playerId, buyIn, cashOut }],
      },
    },
  });
}

const oneDayMs = 24 * 60 * 60 * 1000;

function startOfYear(now: Date) {
  return new Date(now.getFullYear(), 0, 1);
}

function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfWeek(now: Date) {
  const d = new Date(now);
  d.setDate(now.getDate() - now.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

describe('GET /api/stats/groups/:groupId/leaderboard — timeframe', () => {
  it('defaults to all-time when timeframe is omitted (byte-identical to today)', async () => {
    const { group, alice } = await seedGroupWithPlayer();
    // A session far in the past, well outside any real timeframe window.
    await createSession(group.id, alice.id, new Date(2000, 0, 1), 25);

    const omitted = await request(app).get(`/api/stats/groups/${group.id}/leaderboard`);
    const explicitAll = await request(app).get(
      `/api/stats/groups/${group.id}/leaderboard?timeframe=all`
    );

    expect(omitted.status).toBe(200);
    expect(explicitAll.status).toBe(200);
    expect(omitted.body).toEqual(explicitAll.body);
    expect(omitted.body).toHaveLength(1);
    expect(omitted.body[0]).toMatchObject({ playerName: 'Alice', totalGames: 1, balance: 25 });
  });

  it('filters to year-to-date when timeframe=year', async () => {
    const { group, alice } = await seedGroupWithPlayer();
    const now = new Date();
    const yearStart = startOfYear(now);
    const lastYear = new Date(yearStart.getTime() - oneDayMs); // Dec 31 of previous year

    await createSession(group.id, alice.id, yearStart, 30); // in-bounds (boundary itself)
    await createSession(group.id, alice.id, lastYear, 999); // out-of-bounds

    const res = await request(app).get(
      `/api/stats/groups/${group.id}/leaderboard?timeframe=year`
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ playerName: 'Alice', totalGames: 1, balance: 30 });
  });

  it('filters to the current month when timeframe=month', async () => {
    const { group, alice } = await seedGroupWithPlayer();
    const now = new Date();
    const monthStart = startOfMonth(now);
    const lastMonth = new Date(monthStart.getTime() - oneDayMs); // last day of previous month

    await createSession(group.id, alice.id, monthStart, 15); // in-bounds (boundary itself)
    await createSession(group.id, alice.id, lastMonth, 999); // out-of-bounds

    const res = await request(app).get(
      `/api/stats/groups/${group.id}/leaderboard?timeframe=month`
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ playerName: 'Alice', totalGames: 1, balance: 15 });
  });

  it('filters to the current week (Sunday-based) when timeframe=week', async () => {
    const { group, alice } = await seedGroupWithPlayer();
    const now = new Date();
    const weekStart = startOfWeek(now);
    const lastWeek = new Date(weekStart.getTime() - oneDayMs); // the previous Saturday

    await createSession(group.id, alice.id, weekStart, 5); // in-bounds (boundary itself)
    await createSession(group.id, alice.id, lastWeek, 999); // out-of-bounds

    const res = await request(app).get(`/api/stats/groups/${group.id}/leaderboard?timeframe=week`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ playerName: 'Alice', totalGames: 1, balance: 5 });
  });

  it('rejects an unknown timeframe value with 400', async () => {
    const { group } = await seedGroupWithPlayer();

    const res = await request(app).get(
      `/api/stats/groups/${group.id}/leaderboard?timeframe=decade`
    );

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

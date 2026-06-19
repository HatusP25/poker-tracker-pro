import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

describe('app security middleware', () => {
  it('health check responds and is exempt from the rate limiter', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    // Exempt routes carry no RateLimit headers.
    expect(res.headers['ratelimit-limit']).toBeUndefined();
  });

  it('sets helmet security headers on API responses', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    // helmet sets a frameguard header by default
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('applies the rate limiter to /api routes (standard headers present)', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.headers['ratelimit-limit']).toBe('300');
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('reflects the request origin in dev (no credentialed wildcard)', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    // No CORS_ORIGIN configured -> credentials must be disabled.
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });
});

describe('insights endpoints', () => {
  // Seed a minimal group with two players and two sessions so the insights
  // computations have real data to operate on (tables are reset before each test).
  async function seed() {
    const group = await prisma.group.create({
      data: { name: 'Insights Test Group', defaultBuyIn: 10 },
    });
    const alice = await prisma.player.create({ data: { groupId: group.id, name: 'Alice' } });
    const bob = await prisma.player.create({ data: { groupId: group.id, name: 'Bob' } });

    const s1 = await prisma.session.create({
      data: {
        groupId: group.id,
        date: new Date('2026-02-01T00:00:00.000Z'),
        status: 'COMPLETED',
        entries: {
          create: [
            { playerId: alice.id, buyIn: 10, cashOut: 40 }, // +30
            { playerId: bob.id, buyIn: 20, cashOut: 0 }, // -20
          ],
        },
      },
    });
    // Bob rebought once in s1.
    await prisma.rebuyEvent.create({ data: { sessionId: s1.id, playerId: bob.id, amount: 10 } });

    await prisma.session.create({
      data: {
        groupId: group.id,
        date: new Date('2026-03-01T00:00:00.000Z'),
        status: 'COMPLETED',
        entries: {
          create: [
            { playerId: alice.id, buyIn: 10, cashOut: 0 }, // -10
            { playerId: bob.id, buyIn: 10, cashOut: 30 }, // +20
          ],
        },
      },
    });

    return { group, alice, bob };
  }

  it('GET /stats/groups/:groupId/records returns real records', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/records`);
    expect(res.status).toBe(200);
    expect(res.body.biggestWin).toMatchObject({ playerName: 'Alice', value: 30 });
    expect(res.body.biggestLoss).toMatchObject({ playerName: 'Bob', value: -20 });
    expect(res.body.biggestPot).toMatchObject({ total: 30 }); // 10 + 20
  });

  it('GET /stats/groups/:groupId/head-to-head returns rivalry shape', async () => {
    const { group, alice, bob } = await seed();
    const res = await request(app).get(
      `/api/stats/groups/${group.id}/head-to-head?playerA=${alice.id}&playerB=${bob.id}`
    );
    expect(res.status).toBe(200);
    expect(res.body.pair).toMatchObject({ sharedSessions: 2, aWins: 1, bWins: 1 });
    expect(res.body.biggestRivalry).toMatchObject({ sharedSessions: 2 });
    expect(Array.isArray(res.body.playerInsights)).toBe(true);
  });

  it('GET /stats/groups/:groupId/form returns an array of active players', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/form`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('GET /stats/groups/:groupId/season returns recap shape', async () => {
    const { group } = await seed();
    const res = await request(app).get(`/api/stats/groups/${group.id}/season?year=2026`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('period', '2026');
    expect(res.body).toHaveProperty('totalSessions', 2);
    expect(res.body.champion).toMatchObject({ playerName: 'Alice', value: 20 }); // +30 -10
  });
});

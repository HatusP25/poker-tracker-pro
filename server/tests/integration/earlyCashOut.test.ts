import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

/**
 * Early cash-out: someone leaves the game before the night ends. Their result is
 * recorded and locked at that moment, and End Session stops asking for a number
 * it already has. The settlement math still sees the whole table.
 */

async function startLiveSession(playerNames = ['Ana', 'Dave', 'Sam'], buyIn = 20) {
  const group = await prisma.group.create({
    data: { name: 'Cash Out Group', defaultBuyIn: buyIn },
  });

  const players = [];
  for (const name of playerNames) {
    players.push(await prisma.player.create({ data: { groupId: group.id, name } }));
  }

  const res = await request(app)
    .post('/api/live-sessions/start')
    .send({
      groupId: group.id,
      date: '2026-07-30',
      startTime: '19:30',
      players: players.map((p) => ({ playerId: p.id, buyIn })),
    });

  expect(res.status).toBe(201);
  return { group, players, sessionId: res.body.id as string };
}

describe('POST /api/live-sessions/:sessionId/cash-out', () => {
  it('records a departing player’s result and marks them cashed out', async () => {
    const { sessionId, players } = await startLiveSession();

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });

    expect(res.status).toBe(200);
    expect(res.body.cashOut).toBe(45);
    expect(res.body.cashedOutAt).not.toBeNull();
  });

  it('accepts a zero cash-out — busting out is the usual reason to leave', async () => {
    const { sessionId, players } = await startLiveSession();

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 0 });

    expect(res.status).toBe(200);
    expect(res.body.cashedOutAt).not.toBeNull();
  });

  it('rejects cashing the same player out twice', async () => {
    const { sessionId, players } = await startLiveSession();
    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 10 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already cashed out/i);
  });

  it('refuses to cash out the last player at the table', async () => {
    const { sessionId, players } = await startLiveSession(['Ana', 'Dave']);

    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[0].id, cashOut: 20 });

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 20 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/end the session/i);
  });

  it('rejects a negative cash-out', async () => {
    const { sessionId, players } = await startLiveSession();

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: -5 });

    expect(res.status).toBe(400);
  });

  it('rejects a player who is not in the session', async () => {
    const { sessionId } = await startLiveSession();

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: 'not-a-player', cashOut: 10 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not in this session/i);
  });

  it('rejects cashing out of a completed session', async () => {
    const { sessionId, players } = await startLiveSession();
    await request(app)
      .post(`/api/live-sessions/${sessionId}/end`)
      .send({
        endTime: '23:45',
        cashOuts: players.map((p, i) => ({ playerId: p.id, cashOut: i === 0 ? 60 : 0 })),
      });

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 10 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/in-progress/i);
  });
});

describe('rebuys after cashing out', () => {
  it('are rejected — the player’s result is already recorded', async () => {
    const { sessionId, players } = await startLiveSession();
    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/rebuy`)
      .send({ playerId: players[1].id, amount: 20 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cashed out/i);
  });

  it('are allowed again after the cash-out is undone', async () => {
    const { sessionId, players } = await startLiveSession();
    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });
    await request(app).delete(`/api/live-sessions/${sessionId}/cash-out/${players[1].id}`);

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/rebuy`)
      .send({ playerId: players[1].id, amount: 20 });

    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/live-sessions/:sessionId/cash-out/:playerId', () => {
  it('returns the player to the table and clears their amount', async () => {
    const { sessionId, players } = await startLiveSession();
    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });

    const res = await request(app).delete(
      `/api/live-sessions/${sessionId}/cash-out/${players[1].id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.cashedOutAt).toBeNull();
    expect(res.body.cashOut).toBe(0);
  });

  it('rejects undoing for a player who never cashed out', async () => {
    const { sessionId, players } = await startLiveSession();

    const res = await request(app).delete(
      `/api/live-sessions/${sessionId}/cash-out/${players[1].id}`
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/has not cashed out/i);
  });
});

describe('ending a session that had early departures', () => {
  it('only asks for the players still at the table', async () => {
    const { sessionId, players } = await startLiveSession();
    // Dave leaves with 45 of the 60 on the table.
    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/end`)
      .send({
        endTime: '23:45',
        cashOuts: [
          { playerId: players[0].id, cashOut: 15 },
          { playerId: players[2].id, cashOut: 0 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.settlements.length).toBeGreaterThan(0);
  });

  it('still rejects a table that does not reconcile', async () => {
    const { sessionId, players } = await startLiveSession();
    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/end`)
      .send({
        endTime: '23:45',
        cashOuts: [
          { playerId: players[0].id, cashOut: 15 },
          { playerId: players[2].id, cashOut: 999 },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/reconcile/i);
  });

  it('settles the departed player from their recorded amount, not a resubmitted one', async () => {
    const { sessionId, players } = await startLiveSession();
    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });

    await request(app)
      .post(`/api/live-sessions/${sessionId}/end`)
      .send({
        endTime: '23:45',
        cashOuts: [
          { playerId: players[0].id, cashOut: 15 },
          { playerId: players[2].id, cashOut: 0 },
          // A stale value for the departed player must not overwrite their result.
          { playerId: players[1].id, cashOut: 1 },
        ],
      });

    const entry = await prisma.sessionEntry.findFirst({
      where: { sessionId, playerId: players[1].id },
    });
    expect(entry?.cashOut).toBe(45);
  });

  it('errors when a player still at the table has no cash-out', async () => {
    const { sessionId, players } = await startLiveSession();
    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/end`)
      .send({ endTime: '23:45', cashOuts: [{ playerId: players[0].id, cashOut: 15 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing cash-out/i);
  });

  it('preserves the cash-out timestamp through session end', async () => {
    const { sessionId, players } = await startLiveSession();
    await request(app)
      .post(`/api/live-sessions/${sessionId}/cash-out`)
      .send({ playerId: players[1].id, cashOut: 45 });

    await request(app)
      .post(`/api/live-sessions/${sessionId}/end`)
      .send({
        endTime: '23:45',
        cashOuts: [
          { playerId: players[0].id, cashOut: 15 },
          { playerId: players[2].id, cashOut: 0 },
        ],
      });

    const entry = await prisma.sessionEntry.findFirst({
      where: { sessionId, playerId: players[1].id },
    });
    expect(entry?.cashedOutAt).not.toBeNull();
  });
});

describe('backwards compatibility', () => {
  it('a session where nobody leaves early behaves exactly as before', async () => {
    const { sessionId, players } = await startLiveSession();

    const res = await request(app)
      .post(`/api/live-sessions/${sessionId}/end`)
      .send({
        endTime: '23:45',
        cashOuts: [
          { playerId: players[0].id, cashOut: 60 },
          { playerId: players[1].id, cashOut: 0 },
          { playerId: players[2].id, cashOut: 0 },
        ],
      });

    expect(res.status).toBe(200);
    const entries = await prisma.sessionEntry.findMany({ where: { sessionId } });
    expect(entries.every((e) => e.cashedOutAt === null)).toBe(true);
  });
});

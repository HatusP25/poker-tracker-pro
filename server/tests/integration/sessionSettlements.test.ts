import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

async function seedGroupWithPlayers(playerNames: string[]) {
  const group = await prisma.group.create({
    data: { name: 'Settlement Test Group', defaultBuyIn: 100 },
  });
  const players = [];
  for (const name of playerNames) {
    players.push(await prisma.player.create({ data: { groupId: group.id, name } }));
  }
  return { group, players };
}

async function seedCompletedSessionWithSettlements() {
  const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob', 'Carol']);
  const session = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-04-01T00:00:00.000Z'),
      status: 'COMPLETED',
      completedAt: new Date(),
      entries: {
        create: [
          { playerId: players[0].id, buyIn: 100, cashOut: 170 },
          { playerId: players[1].id, buyIn: 100, cashOut: 50 },
          { playerId: players[2].id, buyIn: 100, cashOut: 80 },
        ],
      },
      settlements: JSON.stringify([
        { from: 'Bob', to: 'Alice', amount: 50 },
        { from: 'Carol', to: 'Alice', amount: 20 },
      ]),
    },
  });
  return { group, players, session };
}

describe('PATCH /api/sessions/:sessionId/settlements/:index', () => {
  it('toggles a settlement to paid and back to pending', async () => {
    const { session } = await seedCompletedSessionWithSettlements();

    const paidRes = await request(app)
      .patch(`/api/sessions/${session.id}/settlements/0`)
      .send({ paid: true });

    expect(paidRes.status).toBe(200);
    const paidSettlements = JSON.parse(paidRes.body.settlements);
    expect(paidSettlements[0]).toEqual({ from: 'Bob', to: 'Alice', amount: 50, paid: true });
    // The other settlement is untouched.
    expect(paidSettlements[1]).toEqual({ from: 'Carol', to: 'Alice', amount: 20 });

    const pendingRes = await request(app)
      .patch(`/api/sessions/${session.id}/settlements/0`)
      .send({ paid: false });

    expect(pendingRes.status).toBe(200);
    const pendingSettlements = JSON.parse(pendingRes.body.settlements);
    expect(pendingSettlements[0]).toEqual({ from: 'Bob', to: 'Alice', amount: 50, paid: false });
  });

  it('rejects an out-of-range index with 400', async () => {
    const { session } = await seedCompletedSessionWithSettlements();

    const res = await request(app)
      .patch(`/api/sessions/${session.id}/settlements/5`)
      .send({ paid: true });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects a non-integer index with 400', async () => {
    const { session } = await seedCompletedSessionWithSettlements();

    const res = await request(app)
      .patch(`/api/sessions/${session.id}/settlements/not-a-number`)
      .send({ paid: true });

    expect(res.status).toBe(400);
  });

  it('rejects a non-boolean paid value with 400', async () => {
    const { session } = await seedCompletedSessionWithSettlements();

    const res = await request(app)
      .patch(`/api/sessions/${session.id}/settlements/0`)
      .send({ paid: 'yes' });

    expect(res.status).toBe(400);
  });

  it('rejects updates on a non-COMPLETED (IN_PROGRESS) session with 400', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);
    const inProgress = await prisma.session.create({
      data: {
        groupId: group.id,
        date: new Date('2026-04-02T00:00:00.000Z'),
        status: 'IN_PROGRESS',
        entries: {
          create: [
            { playerId: players[0].id, buyIn: 100, cashOut: 0 },
            { playerId: players[1].id, buyIn: 100, cashOut: 0 },
          ],
        },
      },
    });

    const res = await request(app)
      .patch(`/api/sessions/${inProgress.id}/settlements/0`)
      .send({ paid: true });

    expect(res.status).toBe(400);
  });

  it('rejects a completed session with no settlements with 400', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);
    const noSettlements = await prisma.session.create({
      data: {
        groupId: group.id,
        date: new Date('2026-04-03T00:00:00.000Z'),
        status: 'COMPLETED',
        completedAt: new Date(),
        entries: {
          create: [
            { playerId: players[0].id, buyIn: 100, cashOut: 100 },
            { playerId: players[1].id, buyIn: 100, cashOut: 100 },
          ],
        },
      },
    });

    const res = await request(app)
      .patch(`/api/sessions/${noSettlements.id}/settlements/0`)
      .send({ paid: true });

    expect(res.status).toBe(400);
  });

  it('returns 404 for a missing session', async () => {
    const res = await request(app)
      .patch('/api/sessions/does-not-exist/settlements/0')
      .send({ paid: true });

    expect(res.status).toBe(404);
  });
});

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

async function seedGroupWithPlayers(playerNames: string[]) {
  const group = await prisma.group.create({
    data: { name: 'Banter Pack Test Group', defaultBuyIn: 10 },
  });
  const players = [];
  for (const name of playerNames) {
    players.push(await prisma.player.create({ data: { groupId: group.id, name } }));
  }
  return { group, players };
}

async function createSession(
  groupId: string,
  date: Date,
  entries: { playerId: string; buyIn: number; cashOut: number }[],
  rebuys: { playerId: string; amount: number }[] = []
) {
  return prisma.session.create({
    data: {
      groupId,
      date,
      status: 'COMPLETED',
      completedAt: date,
      entries: { create: entries },
      rebuyEvents: { create: rebuys },
    },
  });
}

describe('GET /api/stats/groups/:groupId/belt', () => {
  it('returns current: null and empty history for a group with no completed sessions', async () => {
    const { group } = await seedGroupWithPlayers(['Alice']);

    const res = await request(app).get(`/api/stats/groups/${group.id}/belt`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ current: null, history: [], totalTitleChanges: 0 });
  });

  it('computes a full takeover/defense lineage across seeded sessions', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);
    const [alice, bob] = players;

    // Night 1: Alice wins big -> first champion.
    await createSession(group.id, new Date('2026-01-01T00:00:00.000Z'), [
      { playerId: alice.id, buyIn: 10, cashOut: 40 }, // +30
      { playerId: bob.id, buyIn: 10, cashOut: 5 }, // -5
    ]);

    // Night 2: Alice plays and nobody beats her -> defense.
    await createSession(group.id, new Date('2026-01-08T00:00:00.000Z'), [
      { playerId: alice.id, buyIn: 10, cashOut: 20 }, // +10
      { playerId: bob.id, buyIn: 10, cashOut: 15 }, // +5
    ]);

    // Night 3: Bob out-profits Alice -> takeover.
    await createSession(group.id, new Date('2026-01-15T00:00:00.000Z'), [
      { playerId: alice.id, buyIn: 10, cashOut: 15 }, // +5
      { playerId: bob.id, buyIn: 10, cashOut: 60 }, // +50
    ]);

    const res = await request(app).get(`/api/stats/groups/${group.id}/belt`);

    expect(res.status).toBe(200);
    expect(res.body.current).toMatchObject({
      playerId: bob.id,
      playerName: 'Bob',
      nightsHeld: 1,
      defenses: 0,
      takenFromPlayerName: 'Alice',
    });
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0]).toMatchObject({
      playerId: alice.id,
      playerName: 'Alice',
      nightsHeld: 3,
      defenses: 1,
      takenFromPlayerName: null,
    });
    expect(res.body.totalTitleChanges).toBe(1);
  });

  it('excludes soft-deleted sessions from the lineage', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);
    const [alice, bob] = players;

    await createSession(group.id, new Date('2026-01-01T00:00:00.000Z'), [
      { playerId: alice.id, buyIn: 10, cashOut: 40 }, // +30
    ]);

    const deletedSession = await createSession(group.id, new Date('2026-01-08T00:00:00.000Z'), [
      { playerId: bob.id, buyIn: 10, cashOut: 1000 }, // would take the belt if it counted
    ]);
    await prisma.session.update({
      where: { id: deletedSession.id },
      data: { deletedAt: new Date() },
    });

    const res = await request(app).get(`/api/stats/groups/${group.id}/belt`);

    expect(res.status).toBe(200);
    expect(res.body.current).toMatchObject({ playerId: alice.id, nightsHeld: 1 });
    expect(res.body.history).toEqual([]);
  });
});

describe('GET /api/stats/groups/:groupId/achievements', () => {
  it('returns empty players and the full 10-badge catalog for a group with no sessions', async () => {
    const { group } = await seedGroupWithPlayers(['Alice']);

    const res = await request(app).get(`/api/stats/groups/${group.id}/achievements`);

    expect(res.status).toBe(200);
    expect(res.body.players).toEqual([]);
    expect(res.body.recentUnlocks).toEqual([]);
    expect(res.body.catalog).toHaveLength(10);
    const catalogIds = res.body.catalog.map((c: { id: string }) => c.id).sort();
    expect(catalogIds).toEqual(
      [
        'comeback-kid',
        'double-up',
        'giant-slayer',
        'hat-trick',
        'iron-man',
        'phoenix',
        'rebuy-royalty',
        'regular',
        'untouchable',
        'veteran',
      ].sort()
    );
  });

  it('awards phoenix for a positive night with 3+ rebuys and surfaces it in recentUnlocks', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice']);
    const [alice] = players;

    await createSession(
      group.id,
      new Date('2026-01-01T00:00:00.000Z'),
      [{ playerId: alice.id, buyIn: 40, cashOut: 60 }], // +20
      [
        { playerId: alice.id, amount: 10 },
        { playerId: alice.id, amount: 10 },
        { playerId: alice.id, amount: 10 },
      ]
    );

    const res = await request(app).get(`/api/stats/groups/${group.id}/achievements`);

    expect(res.status).toBe(200);
    const alicePlayer = res.body.players.find((p: { playerId: string }) => p.playerId === alice.id);
    expect(alicePlayer.earned.map((e: { id: string }) => e.id)).toContain('phoenix');
    expect(res.body.recentUnlocks[0]).toMatchObject({ playerId: alice.id, id: 'phoenix' });
  });
});

describe('GET /api/stats/sessions/:sessionId/summary — titles', () => {
  it('includes night titles (shark/donation/atm/houdini) derived from the session', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);
    const [alice, bob] = players;

    const session = await createSession(
      group.id,
      new Date('2026-01-01T00:00:00.000Z'),
      [
        { playerId: alice.id, buyIn: 30, cashOut: 90 }, // +60, 2 rebuys -> shark + houdini
        { playerId: bob.id, buyIn: 10, cashOut: 0 }, // -10 -> donation
      ],
      [
        { playerId: alice.id, amount: 10 },
        { playerId: alice.id, amount: 10 },
      ]
    );

    const res = await request(app).get(
      `/api/stats/sessions/${session.id}/summary?groupId=${group.id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.titles).toBeDefined();
    const ids = res.body.titles.map((t: { id: string }) => t.id);
    expect(ids).toContain('shark');
    expect(ids).toContain('houdini');
    expect(ids).toContain('donation');
    const shark = res.body.titles.find((t: { id: string }) => t.id === 'shark');
    expect(shark).toMatchObject({ playerId: alice.id, playerName: 'Alice' });
  });
});

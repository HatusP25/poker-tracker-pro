import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

/**
 * RebuyEvent rows are the single source of truth for rebuy counts, but only the
 * live path ever wrote them — so every rebuy-based award silently skipped
 * hand-entered nights. These tests pin the fix: a session typed in by hand now
 * carries the rebuys its totals imply, and earns the titles it always should have.
 */

async function seedGroup(defaultBuyIn = 5) {
  const group = await prisma.group.create({
    data: { name: 'Rebuy Truth Group', defaultBuyIn },
  });
  const ana = await prisma.player.create({ data: { groupId: group.id, name: 'Ana' } });
  const dave = await prisma.player.create({ data: { groupId: group.id, name: 'Dave' } });
  return { group, ana, dave };
}

/** Enter a completed session by hand, the way the Data Entry page does. */
async function enterSession(
  groupId: string,
  entries: { playerId: string; buyIn: number; cashOut: number }[],
  date = '2026-05-01'
) {
  const res = await request(app).post('/api/sessions').send({ groupId, date, entries });
  expect(res.status).toBe(201);
  return res.body;
}

describe('hand-entered sessions carry derived rebuys', () => {
  it('creates one rebuy event per extra buy-in', async () => {
    const { group, ana, dave } = await seedGroup(5);

    // Dave bought in for $15 at a $5 default: two rebuys.
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 20 },
      { playerId: dave.id, buyIn: 15, cashOut: 0 },
    ]);

    const events = await prisma.rebuyEvent.findMany({
      where: { sessionId: session.id, playerId: dave.id },
    });
    expect(events).toHaveLength(2);
    expect(events.every((e) => e.derived)).toBe(true);
    expect(events.map((e) => e.amount).sort()).toEqual([5, 5]);
  });

  it('creates none for a player who bought in once', async () => {
    const { group, ana, dave } = await seedGroup(5);
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 10 },
      { playerId: dave.id, buyIn: 5, cashOut: 0 },
    ]);

    expect(await prisma.rebuyEvent.count({ where: { sessionId: session.id } })).toBe(0);
  });

  it('puts an indivisible remainder in a final smaller rebuy', async () => {
    const { group, ana, dave } = await seedGroup(5);
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 22 },
      { playerId: dave.id, buyIn: 17, cashOut: 0 },
    ]);

    const events = await prisma.rebuyEvent.findMany({
      where: { sessionId: session.id, playerId: dave.id },
      orderBy: { amount: 'desc' },
    });
    expect(events.map((e) => e.amount)).toEqual([5, 5, 2]);
    // The reconstruction always adds back up to the recorded total.
    expect(events.reduce((s, e) => s + e.amount, 0)).toBe(12);
  });

  it('leaves buy-ins, cash-outs and profits untouched', async () => {
    const { group, ana, dave } = await seedGroup(5);
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 20 },
      { playerId: dave.id, buyIn: 15, cashOut: 0 },
    ]);

    const entries = await prisma.sessionEntry.findMany({ where: { sessionId: session.id } });
    expect(entries.find((e) => e.playerId === dave.id)?.buyIn).toBe(15);
    expect(entries.find((e) => e.playerId === dave.id)?.cashOut).toBe(0);
    expect(entries.find((e) => e.playerId === ana.id)?.cashOut).toBe(20);
  });
});

describe('rebuy-based awards now reach hand-entered nights', () => {
  it('crowns ATM and Houdini on a session that was typed in', async () => {
    const { group, ana, dave } = await seedGroup(5);
    // Dave rebuys twice and still finishes up: ATM + Houdini.
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 20, cashOut: 5 },
      { playerId: dave.id, buyIn: 15, cashOut: 30 },
    ]);

    const res = await request(app).get(
      `/api/stats/sessions/${session.id}/summary?groupId=${group.id}`
    );
    expect(res.status).toBe(200);

    const titleIds = res.body.titles.map((t: any) => t.id);
    expect(titleIds).toContain('atm');
    expect(titleIds).toContain('houdini');
    expect(res.body.titles.find((t: any) => t.id === 'houdini').playerName).toBe('Dave');
  });

  it('reports most-rebuys in the session summary highlights', async () => {
    const { group, ana, dave } = await seedGroup(5);
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 25 },
      { playerId: dave.id, buyIn: 20, cashOut: 0 },
    ]);

    const res = await request(app).get(
      `/api/stats/sessions/${session.id}/summary?groupId=${group.id}`
    );

    expect(res.body.highlights.mostRebuys).toMatchObject({ name: 'Dave', rebuys: 3 });
  });

  it('counts most-rebuys in group records', async () => {
    const { group, ana, dave } = await seedGroup(5);
    await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 25 },
      { playerId: dave.id, buyIn: 20, cashOut: 0 },
    ]);

    const res = await request(app).get(`/api/stats/groups/${group.id}/records`);
    expect(res.body.mostRebuys).toMatchObject({ playerName: 'Dave', value: 3 });
  });
});

describe('player stats count whole rebuys, not fractions', () => {
  it('reports an integer count instead of summing fractional buy-in ratios', async () => {
    const { group, ana, dave } = await seedGroup(5);
    // $7 at a $5 default used to report 0.4 rebuys; three of them summed to 1.2.
    for (const date of ['2026-05-01', '2026-05-08', '2026-05-15']) {
      await enterSession(
        group.id,
        [
          { playerId: ana.id, buyIn: 5, cashOut: 7 },
          { playerId: dave.id, buyIn: 7, cashOut: 5 },
        ],
        date
      );
    }

    const res = await request(app).get(`/api/stats/players/${dave.id}/stats`);
    expect(res.status).toBe(200);
    expect(res.body.totalRebuys).toBe(3);
    expect(Number.isInteger(res.body.totalRebuys)).toBe(true);
  });

  it('excludes rebuys from soft-deleted sessions', async () => {
    const { group, ana, dave } = await seedGroup(5);
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 20 },
      { playerId: dave.id, buyIn: 15, cashOut: 0 },
    ]);

    await request(app).delete(`/api/sessions/${session.id}`);

    const res = await request(app).get(`/api/stats/players/${dave.id}/stats`);
    expect(res.body.totalRebuys).toBe(0);
  });
});

describe('legacy sessions with no rebuy events at all', () => {
  /**
   * Every session that predates rebuy-event writing — and any restored from an old
   * backup — has zero rows. Counting rows alone would report 0 rebuys for all of
   * them until a backfill script ran, which would be a visible regression on real
   * history. The read path derives instead, so the backfill is an optimisation
   * rather than a correctness requirement.
   */
  async function legacySession(defaultBuyIn = 5) {
    const { group, ana, dave } = await seedGroup(defaultBuyIn);
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 25 },
      { playerId: dave.id, buyIn: 20, cashOut: 0 },
    ]);
    // Strip the rows, reproducing the state of pre-2026-08-02 history.
    await prisma.rebuyEvent.deleteMany({ where: { sessionId: session.id } });
    return { group, ana, dave, session };
  }

  it('still reports rebuys on session detail', async () => {
    const { dave, session } = await legacySession();
    expect(await prisma.rebuyEvent.count()).toBe(0);

    const res = await request(app).get(`/api/sessions/${session.id}`);
    const entry = res.body.entries.find((e: any) => e.playerId === dave.id);
    expect(entry.rebuys).toBe(3);
  });

  it('still reports rebuys in player stats', async () => {
    const { dave } = await legacySession();

    const res = await request(app).get(`/api/stats/players/${dave.id}/stats`);
    expect(res.body.totalRebuys).toBe(3);
  });

  it('still crowns the rebuy-based night titles', async () => {
    const { group, ana, dave } = await seedGroup(5);
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 20, cashOut: 5 },
      { playerId: dave.id, buyIn: 15, cashOut: 30 },
    ]);
    await prisma.rebuyEvent.deleteMany({ where: { sessionId: session.id } });

    const res = await request(app).get(
      `/api/stats/sessions/${session.id}/summary?groupId=${group.id}`
    );
    const titleIds = res.body.titles.map((t: any) => t.id);
    expect(titleIds).toContain('atm');
    expect(titleIds).toContain('houdini');
  });

  it('still counts most-rebuys in group records', async () => {
    const { group } = await legacySession();

    const res = await request(app).get(`/api/stats/groups/${group.id}/records`);
    expect(res.body.mostRebuys).toMatchObject({ playerName: 'Dave', value: 3 });
  });

  it('still awards rebuy-based achievements', async () => {
    const { group, ana, dave } = await seedGroup(5);
    // Dave rebuys three times and finishes up: Phoenix.
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 0 },
      { playerId: dave.id, buyIn: 20, cashOut: 25 },
    ]);
    await prisma.rebuyEvent.deleteMany({ where: { sessionId: session.id } });

    const res = await request(app).get(`/api/stats/groups/${group.id}/achievements`);
    const daveBadges = res.body.players
      .find((p: any) => p.playerId === dave.id)
      .earned.map((e: any) => e.id);
    expect(daveBadges).toContain('phoenix');
  });

  it('prefers recorded events over the derivation when both could apply', async () => {
    const { group, ana, dave } = await seedGroup(5);
    const start = await request(app)
      .post('/api/live-sessions/start')
      .send({
        groupId: group.id,
        date: '2026-05-01',
        startTime: '19:30',
        players: [
          { playerId: ana.id, buyIn: 5 },
          { playerId: dave.id, buyIn: 5 },
        ],
      });
    // One recorded rebuy of $20 — a single big top-up, not four $5 ones.
    await request(app)
      .post(`/api/live-sessions/${start.body.id}/rebuy`)
      .send({ playerId: dave.id, amount: 20 });

    const res = await request(app).get(`/api/sessions/${start.body.id}`);
    const entry = res.body.entries.find((e: any) => e.playerId === dave.id);
    // What actually happened (1), not what the $25 total would imply (4).
    expect(entry.rebuys).toBe(1);
  });
});

describe('editing an entry re-derives its rebuys', () => {
  it('updates the derived rows when a buy-in is corrected', async () => {
    const { group, ana, dave } = await seedGroup(5);
    const session = await enterSession(group.id, [
      { playerId: ana.id, buyIn: 5, cashOut: 20 },
      { playerId: dave.id, buyIn: 15, cashOut: 0 },
    ]);
    const daveEntry = (
      await prisma.sessionEntry.findMany({ where: { sessionId: session.id } })
    ).find((e) => e.playerId === dave.id)!;

    // It was actually $10, not $15.
    const res = await request(app)
      .patch(`/api/sessions/entries/${daveEntry.id}`)
      .send({ buyIn: 10 });
    expect(res.status).toBe(200);

    const events = await prisma.rebuyEvent.findMany({
      where: { sessionId: session.id, playerId: dave.id },
    });
    expect(events).toHaveLength(1);
  });

  it('never destroys recorded live rebuys when an entry is edited', async () => {
    const { group, ana, dave } = await seedGroup(5);

    // A real live session: Dave's rebuy is observed, not derived.
    const start = await request(app)
      .post('/api/live-sessions/start')
      .send({
        groupId: group.id,
        date: '2026-05-01',
        startTime: '19:30',
        players: [
          { playerId: ana.id, buyIn: 5 },
          { playerId: dave.id, buyIn: 5 },
        ],
      });
    const sessionId = start.body.id;
    await request(app)
      .post(`/api/live-sessions/${sessionId}/rebuy`)
      .send({ playerId: dave.id, amount: 5 });

    const recordedBefore = await prisma.rebuyEvent.findMany({
      where: { sessionId, playerId: dave.id },
    });
    expect(recordedBefore).toHaveLength(1);
    expect(recordedBefore[0].derived).toBe(false);

    // Someone later corrects the buy-in on that entry.
    const daveEntry = (await prisma.sessionEntry.findMany({ where: { sessionId } })).find(
      (e) => e.playerId === dave.id
    )!;
    await request(app).patch(`/api/sessions/entries/${daveEntry.id}`).send({ buyIn: 20 });

    // The observed rebuy survives, with its real timestamp, and nothing was
    // reconstructed on top of it.
    const after = await prisma.rebuyEvent.findMany({ where: { sessionId, playerId: dave.id } });
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(recordedBefore[0].id);
    expect(after[0].derived).toBe(false);
  });
});

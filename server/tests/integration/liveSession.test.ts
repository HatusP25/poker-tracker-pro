import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { liveSessionService } from '../../src/services/liveSessionService';
import { ValidationError } from '../../src/utils/validators';

async function seedGroupWithPlayers(playerNames: string[]) {
  const group = await prisma.group.create({
    data: { name: 'Test Group', defaultBuyIn: 100 },
  });
  const players = [];
  for (const name of playerNames) {
    players.push(
      await prisma.player.create({ data: { groupId: group.id, name } })
    );
  }
  return { group, players };
}

const today = () => new Date().toISOString().slice(0, 10);

describe('liveSessionService — lifecycle', () => {
  it('starts a session, adds a rebuy, ends it, and produces correct settlements', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);

    const started = await liveSessionService.startSession({
      groupId: group.id,
      date: today(),
      startTime: '19:00',
      players: [
        { playerId: players[0].id, buyIn: 100 },
        { playerId: players[1].id, buyIn: 100 },
      ],
    });
    expect(started.status).toBe('IN_PROGRESS');
    expect(started.entries).toHaveLength(2);

    // Alice rebuys 100 -> her buyIn becomes 200
    await liveSessionService.addRebuy(started.id, players[0].id, 100);

    // End: Alice cashes 0, Bob cashes 300. Total buyIn 300, total cashOut 300.
    const ended = await liveSessionService.endSession(started.id, {
      endTime: '23:00',
      cashOuts: [
        { playerId: players[0].id, cashOut: 0 },
        { playerId: players[1].id, cashOut: 300 },
      ],
    });

    expect(ended.session.status).toBe('COMPLETED');
    // Alice lost 200, Bob won 200 -> Alice pays Bob 200.
    expect(ended.settlements).toEqual([{ from: 'Alice', to: 'Bob', amount: 200 }]);

    // Rebuy was persisted.
    const rebuys = await prisma.rebuyEvent.findMany({ where: { sessionId: started.id } });
    expect(rebuys).toHaveLength(1);
    expect(rebuys[0].amount).toBe(100);
  });

  it('rejects a non-zero-sum end and leaves the session IN_PROGRESS (no partial write)', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);
    const started = await liveSessionService.startSession({
      groupId: group.id,
      date: today(),
      startTime: '19:00',
      players: [
        { playerId: players[0].id, buyIn: 100 },
        { playerId: players[1].id, buyIn: 100 },
      ],
    });

    // Cash-outs sum to 250 but buy-ins sum to 200 -> must throw, persist nothing.
    await expect(
      liveSessionService.endSession(started.id, {
        endTime: '23:00',
        cashOuts: [
          { playerId: players[0].id, cashOut: 150 },
          { playerId: players[1].id, cashOut: 100 },
        ],
      })
    ).rejects.toBeInstanceOf(ValidationError);

    const after = await prisma.session.findUnique({
      where: { id: started.id },
      include: { entries: true },
    });
    expect(after!.status).toBe('IN_PROGRESS');
    // Cash-outs must still be the untouched initial 0.
    expect(after!.entries.every(e => e.cashOut === 0)).toBe(true);
  });

  it('rejects invalid rebuy amounts before touching the database', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);
    const started = await liveSessionService.startSession({
      groupId: group.id,
      date: today(),
      startTime: '19:00',
      players: [
        { playerId: players[0].id, buyIn: 100 },
        { playerId: players[1].id, buyIn: 100 },
      ],
    });

    for (const bad of [-50, 0, NaN]) {
      await expect(
        liveSessionService.addRebuy(started.id, players[0].id, bad)
      ).rejects.toBeInstanceOf(ValidationError);
    }

    // Buy-in unchanged, no rebuy events created.
    const entry = await prisma.sessionEntry.findFirst({
      where: { sessionId: started.id, playerId: players[0].id },
    });
    expect(entry!.buyIn).toBe(100);
    const rebuys = await prisma.rebuyEvent.count({ where: { sessionId: started.id } });
    expect(rebuys).toBe(0);
  });

  it('rejects starting a session with an invalid buy-in', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);
    await expect(
      liveSessionService.startSession({
        groupId: group.id,
        date: today(),
        startTime: '19:00',
        players: [
          { playerId: players[0].id, buyIn: -10 },
          { playerId: players[1].id, buyIn: 100 },
        ],
      })
    ).rejects.toBeInstanceOf(ValidationError);

    const sessions = await prisma.session.count({ where: { groupId: group.id } });
    expect(sessions).toBe(0);
  });
});

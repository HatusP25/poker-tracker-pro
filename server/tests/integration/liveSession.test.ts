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

  it('edits a rebuy amount and adjusts the buy-in by the delta', async () => {
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

    const { rebuyEvent } = await liveSessionService.addRebuy(started.id, players[0].id, 50);
    // Alice's buyIn is now 150. Fat-fingered — meant to rebuy 80, not 50.
    const { entry, rebuyEvent: updated } = await liveSessionService.updateRebuy(
      started.id,
      rebuyEvent.id,
      80
    );

    expect(updated.amount).toBe(80);
    expect(entry.buyIn).toBe(180); // 100 + 80

    const persisted = await prisma.sessionEntry.findFirst({
      where: { sessionId: started.id, playerId: players[0].id },
    });
    expect(persisted!.buyIn).toBe(180);
  });

  it('deletes a rebuy and reverses its amount out of the buy-in', async () => {
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

    const { rebuyEvent } = await liveSessionService.addRebuy(started.id, players[0].id, 50);
    const { entry } = await liveSessionService.deleteRebuy(started.id, rebuyEvent.id);

    expect(entry.buyIn).toBe(100);

    const remaining = await prisma.rebuyEvent.findMany({ where: { sessionId: started.id } });
    expect(remaining).toHaveLength(0);
  });

  it('rejects editing/deleting a rebuy for the wrong session', async () => {
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
    const otherGroup = await seedGroupWithPlayers(['Carl', 'Dana']);
    const otherSession = await liveSessionService.startSession({
      groupId: otherGroup.group.id,
      date: today(),
      startTime: '19:00',
      players: [
        { playerId: otherGroup.players[0].id, buyIn: 100 },
        { playerId: otherGroup.players[1].id, buyIn: 100 },
      ],
    });

    const { rebuyEvent } = await liveSessionService.addRebuy(started.id, players[0].id, 50);

    await expect(
      liveSessionService.updateRebuy(otherSession.id, rebuyEvent.id, 60)
    ).rejects.toThrow('Rebuy not found for this session');

    await expect(
      liveSessionService.deleteRebuy(otherSession.id, rebuyEvent.id)
    ).rejects.toThrow('Rebuy not found for this session');
  });

  it('rejects editing/deleting a rebuy on a completed session', async () => {
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

    const { rebuyEvent } = await liveSessionService.addRebuy(started.id, players[0].id, 50);

    await liveSessionService.endSession(started.id, {
      endTime: '23:00',
      cashOuts: [
        { playerId: players[0].id, cashOut: 150 },
        { playerId: players[1].id, cashOut: 100 },
      ],
    });

    await expect(
      liveSessionService.updateRebuy(started.id, rebuyEvent.id, 60)
    ).rejects.toThrow('Can only edit rebuys on in-progress sessions');

    await expect(
      liveSessionService.deleteRebuy(started.id, rebuyEvent.id)
    ).rejects.toThrow('Can only delete rebuys on in-progress sessions');
  });

  it('rejects a rebuy edit with an invalid amount and leaves the buy-in untouched', async () => {
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

    const { rebuyEvent } = await liveSessionService.addRebuy(started.id, players[0].id, 50);

    for (const bad of [-10, 0, NaN]) {
      await expect(
        liveSessionService.updateRebuy(started.id, rebuyEvent.id, bad)
      ).rejects.toBeInstanceOf(ValidationError);
    }

    const entry = await prisma.sessionEntry.findFirst({
      where: { sessionId: started.id, playerId: players[0].id },
    });
    expect(entry!.buyIn).toBe(150); // unchanged
  });

  it('rejects a rebuy edit/delete that would drop the buy-in to $0 or below', async () => {
    const { group, players } = await seedGroupWithPlayers(['Alice', 'Bob']);
    const started = await liveSessionService.startSession({
      groupId: group.id,
      date: today(),
      startTime: '19:00',
      players: [
        { playerId: players[0].id, buyIn: 20 },
        { playerId: players[1].id, buyIn: 100 },
      ],
    });

    const { rebuyEvent } = await liveSessionService.addRebuy(started.id, players[0].id, 15);
    // Alice's buyIn is now 35 (20 + 15). Shrink her base buy-in down to exactly the rebuy
    // amount so that deleting the rebuy would zero out her buy-in entirely.
    await prisma.sessionEntry.update({
      where: { sessionId_playerId: { sessionId: started.id, playerId: players[0].id } },
      data: { buyIn: 15 },
    });

    await expect(
      liveSessionService.deleteRebuy(started.id, rebuyEvent.id)
    ).rejects.toBeInstanceOf(ValidationError);

    const entry = await prisma.sessionEntry.findFirst({
      where: { sessionId: started.id, playerId: players[0].id },
    });
    expect(entry!.buyIn).toBe(15); // unchanged after the rejected delete
  });

  it('stamps completedAt when a session ends, and reopen clears it', async () => {
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

    const before = new Date();
    const ended = await liveSessionService.endSession(started.id, {
      endTime: '23:00',
      cashOuts: [
        { playerId: players[0].id, cashOut: 100 },
        { playerId: players[1].id, cashOut: 100 },
      ],
    });

    expect(ended.session.completedAt).not.toBeNull();
    expect(ended.session.completedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());

    const reopened = await liveSessionService.reopenSession(started.id);
    expect(reopened.status).toBe('IN_PROGRESS');
    expect(reopened.completedAt).toBeNull();
  });

  it('rejects reopen based on completedAt, not updatedAt — a later edit must not re-extend the 24h window', async () => {
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

    await liveSessionService.endSession(started.id, {
      endTime: '23:00',
      cashOuts: [
        { playerId: players[0].id, cashOut: 100 },
        { playerId: players[1].id, cashOut: 100 },
      ],
    });

    // Simulate: session was completed 30 hours ago, then edited just now (e.g. a note
    // was added), which bumps updatedAt but must NOT bump completedAt. Before the fix,
    // reopenSession used updatedAt and this recent edit would have re-opened the window.
    const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000);
    await prisma.$executeRaw`UPDATE sessions SET "completedAt" = ${thirtyHoursAgo}, "updatedAt" = NOW() WHERE id = ${started.id}`;

    await expect(liveSessionService.reopenSession(started.id)).rejects.toThrow(
      'Can only reopen sessions completed less than 24 hours ago'
    );
  });

  it('falls back to updatedAt for legacy rows with a null completedAt', async () => {
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

    await liveSessionService.endSession(started.id, {
      endTime: '23:00',
      cashOuts: [
        { playerId: players[0].id, cashOut: 100 },
        { playerId: players[1].id, cashOut: 100 },
      ],
    });

    // Simulate a legacy row written before completedAt existed.
    await prisma.$executeRaw`UPDATE sessions SET "completedAt" = NULL WHERE id = ${started.id}`;

    const reopened = await liveSessionService.reopenSession(started.id);
    expect(reopened.status).toBe('IN_PROGRESS');
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

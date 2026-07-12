/**
 * Live Session Service
 *
 * Handles real-time poker session tracking:
 * - Start sessions with initial players
 * - Track rebuys during gameplay
 * - Add players mid-game
 * - End sessions with settlements
 */

import { prisma } from '../lib/prisma';
import { calculateSessionSettlements } from './settlementService';
import { isValidBuyIn, isValidCashOut, ValidationError } from '../utils/validators';
import { adjustBuyInForRebuyChange, round } from '../utils/calculations';

export class LiveSessionService {
  /**
   * Start a new live session
   */
  async startSession(data: {
    groupId: string;
    date: string;
    startTime: string;
    location?: string;
    players: Array<{ playerId: string; buyIn: number }>;
  }) {
    // Validate at least 2 players
    if (data.players.length < 2) {
      throw new ValidationError('At least 2 players required to start a session');
    }

    // Validate each buy-in
    for (const p of data.players) {
      if (!isValidBuyIn(p.buyIn)) {
        throw new ValidationError('Invalid buy-in amount');
      }
    }

    // Check for duplicate players
    const playerIds = data.players.map(p => p.playerId);
    const uniquePlayerIds = new Set(playerIds);
    if (playerIds.length !== uniquePlayerIds.size) {
      throw new ValidationError('Duplicate players not allowed');
    }

    // Create session with IN_PROGRESS status
    const session = await prisma.session.create({
      data: {
        groupId: data.groupId,
        date: new Date(data.date),
        startTime: data.startTime,
        location: data.location,
        status: 'IN_PROGRESS',
        entries: {
          create: data.players.map(p => ({
            playerId: p.playerId,
            buyIn: p.buyIn,
            cashOut: 0, // Will be set when session ends
          })),
        },
      },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });

    return session;
  }

  /**
   * Get live session with all details
   */
  async getLiveSession(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
        rebuyEvents: {
          include: {
            player: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        group: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Calculate duration if session is in progress
    let duration = 0;
    if (session.status === 'IN_PROGRESS' && session.startTime) {
      const startDateTime = new Date(session.date);
      const [hours, minutes] = session.startTime.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);
      const now = new Date();
      duration = Math.floor((now.getTime() - startDateTime.getTime()) / 1000 / 60); // Minutes
    }

    return {
      session,
      duration,
    };
  }

  /**
   * Add a rebuy for an existing player
   */
  async addRebuy(sessionId: string, playerId: string, amount: number) {
    // Validate rebuy amount before touching the database
    if (!isValidBuyIn(amount)) {
      throw new ValidationError('Invalid rebuy amount');
    }

    // Validate session is in progress
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Can only add rebuys to in-progress sessions');
    }

    // Find player's entry
    const entry = await prisma.sessionEntry.findUnique({
      where: {
        sessionId_playerId: {
          sessionId,
          playerId,
        },
      },
    });

    if (!entry) {
      throw new Error('Player not in this session');
    }

    // Use transaction to update entry AND create rebuy event
    const [updatedEntry, rebuyEvent] = await prisma.$transaction([
      prisma.sessionEntry.update({
        where: { id: entry.id },
        data: {
          buyIn: entry.buyIn + amount,
        },
        include: {
          player: true,
        },
      }),
      prisma.rebuyEvent.create({
        data: {
          sessionId,
          playerId,
          amount,
        },
        include: {
          player: true,
        },
      }),
    ]);

    return { entry: updatedEntry, rebuyEvent };
  }

  /**
   * Edit a rebuy that was recorded for the wrong amount. Adjusts the owning
   * SessionEntry's buyIn by the delta (newAmount - oldAmount) atomically with the
   * RebuyEvent update, so the two never drift apart.
   */
  async updateRebuy(sessionId: string, rebuyId: string, amount: number) {
    if (!isValidBuyIn(amount)) {
      throw new ValidationError('Invalid rebuy amount');
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Can only edit rebuys on in-progress sessions');
    }

    const rebuyEvent = await prisma.rebuyEvent.findUnique({
      where: { id: rebuyId },
    });

    if (!rebuyEvent || rebuyEvent.sessionId !== sessionId) {
      throw new Error('Rebuy not found for this session');
    }

    const entry = await prisma.sessionEntry.findUnique({
      where: {
        sessionId_playerId: {
          sessionId,
          playerId: rebuyEvent.playerId,
        },
      },
    });

    if (!entry) {
      throw new Error('Player not in this session');
    }

    const delta = round(amount - rebuyEvent.amount);
    const newBuyIn = adjustBuyInForRebuyChange(entry.buyIn, delta);

    if (newBuyIn <= 0) {
      throw new ValidationError('Editing this rebuy would leave the player with a buy-in of $0 or less');
    }

    const [updatedEntry, updatedRebuyEvent] = await prisma.$transaction([
      prisma.sessionEntry.update({
        where: { id: entry.id },
        data: { buyIn: newBuyIn },
        include: { player: true },
      }),
      prisma.rebuyEvent.update({
        where: { id: rebuyId },
        data: { amount },
        include: { player: true },
      }),
    ]);

    return { entry: updatedEntry, rebuyEvent: updatedRebuyEvent };
  }

  /**
   * Undo a fat-fingered rebuy entirely. Removes the RebuyEvent and reverses its
   * amount out of the owning SessionEntry's buyIn atomically.
   */
  async deleteRebuy(sessionId: string, rebuyId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Can only delete rebuys on in-progress sessions');
    }

    const rebuyEvent = await prisma.rebuyEvent.findUnique({
      where: { id: rebuyId },
    });

    if (!rebuyEvent || rebuyEvent.sessionId !== sessionId) {
      throw new Error('Rebuy not found for this session');
    }

    const entry = await prisma.sessionEntry.findUnique({
      where: {
        sessionId_playerId: {
          sessionId,
          playerId: rebuyEvent.playerId,
        },
      },
    });

    if (!entry) {
      throw new Error('Player not in this session');
    }

    const newBuyIn = adjustBuyInForRebuyChange(entry.buyIn, -rebuyEvent.amount);

    if (newBuyIn <= 0) {
      throw new ValidationError('Deleting this rebuy would leave the player with a buy-in of $0 or less');
    }

    const [updatedEntry] = await prisma.$transaction([
      prisma.sessionEntry.update({
        where: { id: entry.id },
        data: { buyIn: newBuyIn },
        include: { player: true },
      }),
      prisma.rebuyEvent.delete({
        where: { id: rebuyId },
      }),
    ]);

    return { entry: updatedEntry };
  }

  /**
   * Add a new player to an in-progress session
   */
  async addPlayer(sessionId: string, playerId: string, buyIn: number) {
    // Validate buy-in before touching the database
    if (!isValidBuyIn(buyIn)) {
      throw new ValidationError('Invalid buy-in amount');
    }

    // Validate session is in progress
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        entries: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Can only add players to in-progress sessions');
    }

    // Check if player already in session
    const existingEntry = session.entries.find(e => e.playerId === playerId);
    if (existingEntry) {
      throw new Error('Player already in this session');
    }

    // Add new entry
    const newEntry = await prisma.sessionEntry.create({
      data: {
        sessionId,
        playerId,
        buyIn,
        cashOut: 0,
      },
      include: {
        player: true,
      },
    });

    return newEntry;
  }

  /**
   * End a live session and calculate settlements
   */
  async endSession(
    sessionId: string,
    data: {
      endTime: string;
      cashOuts: Array<{ playerId: string; cashOut: number }>;
    }
  ) {
    // Get session with entries
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Session is not in progress');
    }

    // Validate all players have a valid cash-out
    const cashOutMap = new Map(data.cashOuts.map(c => [c.playerId, c.cashOut]));

    for (const entry of session.entries) {
      if (!cashOutMap.has(entry.playerId)) {
        throw new ValidationError(`Missing cash-out for player: ${entry.player.name}`);
      }
      if (!isValidCashOut(cashOutMap.get(entry.playerId)!)) {
        throw new ValidationError(`Invalid cash-out for player: ${entry.player.name}`);
      }
    }

    // Compute settlements from the about-to-be-saved cash-outs. This validates
    // zero-sum (throws ValidationError -> 400) BEFORE we persist anything, so a
    // non-reconciling table never leaves the session half-written.
    const settlements = calculateSessionSettlements(
      session.entries.map(e => ({
        playerId: e.playerId,
        playerName: e.player.name,
        buyIn: e.buyIn,
        cashOut: cashOutMap.get(e.playerId)!,
      }))
    );

    // Persist cash-outs and the status flip atomically.
    const updatedSession = await prisma.$transaction(async tx => {
      await Promise.all(
        session.entries.map(entry =>
          tx.sessionEntry.update({
            where: { id: entry.id },
            data: { cashOut: cashOutMap.get(entry.playerId)! },
          })
        )
      );

      return tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          endTime: data.endTime,
          settlements: JSON.stringify(settlements),
          completedAt: new Date(),
        },
        include: {
          entries: {
            include: {
              player: true,
            },
          },
        },
      });
    });

    return {
      session: updatedSession,
      settlements,
    };
  }

  /**
   * Force-end a live session without recording cash-outs or settlements.
   * Used as a last resort when a session is stuck in IN_PROGRESS.
   */
  async forceEndSession(sessionId: string, endTime?: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new Error('Session is not in progress');
    }

    // Use client-provided endTime if available, otherwise fall back to server local time
    if (!endTime) {
      const now = new Date();
      endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime,
        settlements: JSON.stringify([]),
        completedAt: new Date(),
      },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });

    return { session: updatedSession, settlements: [] };
  }

  /**
   * Reopen a completed session for editing
   * Only allowed within 24 hours of completion
   */
  async reopenSession(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'COMPLETED') {
      throw new Error('Can only reopen completed sessions');
    }

    // Check if within 24 hours of completion. Use completedAt (set precisely when the
    // session transitioned to COMPLETED) rather than updatedAt, which any later edit
    // (notes, photos, entry tweaks) would bump and silently re-extend this window.
    // Fall back to updatedAt for legacy rows written before completedAt existed.
    const completedAt = session.completedAt ?? session.updatedAt;
    const now = new Date();
    const hoursSinceCompletion =
      (now.getTime() - completedAt.getTime()) / 1000 / 60 / 60;

    if (hoursSinceCompletion > 24) {
      throw new Error('Can only reopen sessions completed less than 24 hours ago');
    }

    // Reopen session
    const reopenedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        settlements: null, // Clear previous settlements
        completedAt: null,
      },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });

    return reopenedSession;
  }

  /**
   * Get active (in-progress) sessions for a group
   */
  async getActiveSessions(groupId: string) {
    const sessions = await prisma.session.findMany({
      where: {
        groupId,
        status: 'IN_PROGRESS',
        deletedAt: null,
      },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sessions;
  }
}

export const liveSessionService = new LiveSessionService();

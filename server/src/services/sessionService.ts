import { prisma } from '../lib/prisma';
import {
  isValidDate,
  isValidBuyIn,
  isValidCashOut,
  isFutureDate,
  ValidationError,
} from '../utils/validators';
import { calculateProfit } from '../utils/calculations';
import { deriveRebuyAmounts } from '../utils/rebuys';
import { setSettlementPaid } from './settlementService';

interface SessionEntryInput {
  playerId: string;
  buyIn: number;
  cashOut: number;
}

interface SessionInput {
  groupId: string;
  date: string | Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  photoUrls?: string[];
  entries: SessionEntryInput[];
}

export class SessionService {
  /**
   * Get all sessions for a group
   * By default, excludes soft-deleted sessions
   */
  async getSessionsByGroup(groupId: string, limit?: number, includeDeleted = false) {
    const where = includeDeleted
      ? { groupId }
      : { groupId, deletedAt: null };

    return prisma.session.findMany({
      where,
      include: {
        entries: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      ...(limit && { take: limit }),
    });
  }

  /**
   * Get a single session by ID
   */
  async getSessionById(id: string) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        group: true,
        entries: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
        rebuyEvents: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Rebuy counts come from RebuyEvent rows — the single source of truth — rather
    // than from arithmetic on the total, which disagreed with every other consumer.
    const rebuysByPlayer = new Map<string, number>();
    for (const r of session.rebuyEvents) {
      rebuysByPlayer.set(r.playerId, (rebuysByPlayer.get(r.playerId) ?? 0) + 1);
    }

    const entriesWithCalculations = session.entries.map(entry => ({
      ...entry,
      profit: calculateProfit(entry.cashOut, entry.buyIn),
      rebuys: rebuysByPlayer.get(entry.playerId) ?? 0,
    }));

    return {
      ...session,
      entries: entriesWithCalculations,
    };
  }

  /**
   * Create a new session
   */
  async createSession(data: SessionInput) {
    // Validate date
    const sessionDate = typeof data.date === 'string' ? new Date(data.date) : data.date;

    if (!isValidDate(sessionDate.toISOString())) {
      throw new ValidationError('Invalid date format');
    }

    if (isFutureDate(sessionDate)) {
      throw new ValidationError('Session date cannot be in the future');
    }

    // Validate entries
    if (!data.entries || data.entries.length < 2) {
      throw new ValidationError('A session must have at least 2 players');
    }

    // Validate buy-ins and cash-outs
    for (const entry of data.entries) {
      if (!isValidBuyIn(entry.buyIn)) {
        throw new ValidationError('Invalid buy-in amount');
      }
      if (!isValidCashOut(entry.cashOut)) {
        throw new ValidationError('Invalid cash-out amount');
      }
    }

    // Check for duplicate players
    const playerIds = data.entries.map(e => e.playerId);
    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== playerIds.length) {
      throw new ValidationError('Duplicate players in session');
    }

    // Rebuys implied by each buy-in above the group default. Without these, a
    // hand-entered session has no RebuyEvent rows at all, and every rebuy-based
    // award (ATM, Houdini, Phoenix, Rebuy Royalty, most-rebuys, biggest-comeback)
    // silently skips it — see docs/ai-audit/2026-07-30-codebase-analysis.md §3.3.
    const group = await prisma.group.findUnique({
      where: { id: data.groupId },
      select: { defaultBuyIn: true },
    });
    if (!group) {
      throw new ValidationError('Group not found');
    }

    const derivedRebuys = data.entries.flatMap(entry =>
      deriveRebuyAmounts(entry.buyIn, group.defaultBuyIn).map(amount => ({
        playerId: entry.playerId,
        amount,
        derived: true,
      }))
    );

    // Create session with entries. Status defaults to COMPLETED (schema default) since
    // this path is for directly-entered historical sessions, not the live-session flow.
    // Stamp completedAt so the reopen 24h window (liveSessionService.reopenSession) has
    // a real completion timestamp to work from, distinct from updatedAt.
    return prisma.session.create({
      data: {
        groupId: data.groupId,
        date: sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        notes: data.notes,
        photoUrls: data.photoUrls ? JSON.stringify(data.photoUrls) : null,
        completedAt: new Date(),
        entries: {
          create: data.entries.map(entry => ({
            playerId: entry.playerId,
            buyIn: entry.buyIn,
            cashOut: entry.cashOut,
          })),
        },
        ...(derivedRebuys.length > 0 && { rebuyEvents: { create: derivedRebuys } }),
      },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });
  }

  /**
   * Re-derive an entry's rebuy events after its buy-in changed.
   *
   * Only ever deletes rows flagged `derived` — a live-tracked night's real,
   * timestamped rebuys are never touched, so editing a completed live session
   * cannot destroy observed history. An entry that already carries recorded
   * (non-derived) rebuys is left alone entirely: its rows are the truth, and a
   * reconstruction would double-count them.
   */
  private async reDeriveRebuyEvents(entryId: string, newBuyIn: number) {
    const entry = await prisma.sessionEntry.findUnique({
      where: { id: entryId },
      include: { session: { include: { group: { select: { defaultBuyIn: true } } } } },
    });
    if (!entry) return;

    const recorded = await prisma.rebuyEvent.count({
      where: { sessionId: entry.sessionId, playerId: entry.playerId, derived: false },
    });
    if (recorded > 0) return;

    const amounts = deriveRebuyAmounts(newBuyIn, entry.session.group.defaultBuyIn);

    await prisma.$transaction([
      prisma.rebuyEvent.deleteMany({
        where: { sessionId: entry.sessionId, playerId: entry.playerId, derived: true },
      }),
      ...(amounts.length > 0
        ? [
            prisma.rebuyEvent.createMany({
              data: amounts.map(amount => ({
                sessionId: entry.sessionId,
                playerId: entry.playerId,
                amount,
                derived: true,
              })),
            }),
          ]
        : []),
    ]);
  }

  /**
   * Update a session
   */
  async updateSession(
    id: string,
    data: {
      date?: string | Date;
      startTime?: string;
      endTime?: string;
      location?: string;
      notes?: string;
      photoUrls?: string[];
      status?: string;
      settlements?: string;
    }
  ) {
    if (data.date) {
      const sessionDate = typeof data.date === 'string' ? new Date(data.date) : data.date;

      if (!isValidDate(sessionDate.toISOString())) {
        throw new ValidationError('Invalid date format');
      }

      if (isFutureDate(sessionDate)) {
        throw new ValidationError('Session date cannot be in the future');
      }
    }

    return prisma.session.update({
      where: { id },
      data: {
        ...(data.date && { date: typeof data.date === 'string' ? new Date(data.date) : data.date }),
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime !== undefined && { endTime: data.endTime }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.photoUrls && { photoUrls: JSON.stringify(data.photoUrls) }),
        ...(data.status !== undefined && { status: data.status }),
        // Keep completedAt in sync whenever this generic update path flips status:
        // stamp it on a transition to COMPLETED, clear it on a transition back to IN_PROGRESS.
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
        ...(data.status === 'IN_PROGRESS' && { completedAt: null }),
        ...(data.settlements !== undefined && { settlements: data.settlements }),
      },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });
  }

  /**
   * Update a session entry
   */
  async updateSessionEntry(
    entryId: string,
    data: { buyIn?: number; cashOut?: number }
  ) {
    if (data.buyIn !== undefined && !isValidBuyIn(data.buyIn)) {
      throw new ValidationError('Invalid buy-in amount');
    }

    if (data.cashOut !== undefined && !isValidCashOut(data.cashOut)) {
      throw new ValidationError('Invalid cash-out amount');
    }

    const updated = await prisma.sessionEntry.update({
      where: { id: entryId },
      data: {
        ...(data.buyIn !== undefined && { buyIn: data.buyIn }),
        ...(data.cashOut !== undefined && { cashOut: data.cashOut }),
      },
      include: {
        player: true,
      },
    });

    // Keep the derived rebuy rows consistent with the corrected total.
    if (data.buyIn !== undefined) {
      await this.reDeriveRebuyEvents(entryId, data.buyIn);
    }

    return updated;
  }

  /**
   * Soft delete a session (sets deletedAt timestamp)
   */
  async deleteSession(id: string) {
    return prisma.session.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted session
   */
  async restoreSession(id: string) {
    return prisma.session.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Permanently delete sessions older than 30 days
   */
  async cleanupOldDeletedSessions() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return prisma.session.deleteMany({
      where: {
        deletedAt: {
          lte: thirtyDaysAgo,
        },
      },
    });
  }

  /**
   * Delete a session entry
   */
  async deleteSessionEntry(entryId: string) {
    // Check if this would leave the session with < 2 players
    const entry = await prisma.sessionEntry.findUnique({
      where: { id: entryId },
      include: {
        session: {
          include: {
            _count: {
              select: {
                entries: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new Error('Session entry not found');
    }

    if (entry.session._count.entries <= 2) {
      throw new ValidationError(
        'Cannot delete entry - session must have at least 2 players'
      );
    }

    return prisma.sessionEntry.delete({
      where: { id: entryId },
    });
  }

  /**
   * Add an entry to an existing session
   */
  async addSessionEntry(sessionId: string, data: SessionEntryInput) {
    if (!isValidBuyIn(data.buyIn)) {
      throw new ValidationError('Invalid buy-in amount');
    }

    if (!isValidCashOut(data.cashOut)) {
      throw new ValidationError('Invalid cash-out amount');
    }

    // Check if player already has an entry in this session
    const existing = await prisma.sessionEntry.findFirst({
      where: {
        sessionId,
        playerId: data.playerId,
      },
    });

    if (existing) {
      throw new ValidationError('Player already has an entry in this session');
    }

    const created = await prisma.sessionEntry.create({
      data: {
        sessionId,
        playerId: data.playerId,
        buyIn: data.buyIn,
        cashOut: data.cashOut,
      },
      include: {
        player: true,
      },
    });

    // Same reconstruction as createSession — a player added to a hand-entered
    // session should carry the rebuys their total implies.
    await this.reDeriveRebuyEvents(created.id, data.buyIn);

    return created;
  }

  /**
   * Mark a single settlement transfer within a completed session's settlements
   * as paid or pending. Per-session display state only — never touches
   * from/to/amount (see docs/DECISIONS.md D-001: no cross-session ledger).
   */
  async updateSettlementPaid(sessionId: string, index: number, paid: boolean) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'COMPLETED') {
      throw new ValidationError('Can only update settlements on a completed session');
    }

    // setSettlementPaid validates paid is boolean, index is an in-range integer,
    // and that settlements exist — throwing ValidationError (400) otherwise.
    const updatedSettlements = setSettlementPaid(session.settlements, index, paid);

    return prisma.session.update({
      where: { id: sessionId },
      data: { settlements: updatedSettlements },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });
  }
}

export const sessionService = new SessionService();

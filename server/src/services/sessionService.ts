import { PrismaClient } from '@prisma/client';
import {
  isValidDate,
  isValidBuyIn,
  isValidCashOut,
  isFutureDate,
  ValidationError,
} from '../utils/validators';
import { calculateProfit, calculateRebuys } from '../utils/calculations';

const prisma = new PrismaClient();

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
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Add calculated fields to entries
    const entriesWithCalculations = session.entries.map(entry => ({
      ...entry,
      profit: calculateProfit(entry.cashOut, entry.buyIn),
      rebuys: calculateRebuys(entry.buyIn, session.group.defaultBuyIn),
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

    // Create session with entries
    return prisma.session.create({
      data: {
        groupId: data.groupId,
        date: sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        notes: data.notes,
        photoUrls: data.photoUrls ? JSON.stringify(data.photoUrls) : null,
        entries: {
          create: data.entries.map(entry => ({
            playerId: entry.playerId,
            buyIn: entry.buyIn,
            cashOut: entry.cashOut,
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

    return prisma.sessionEntry.update({
      where: { id: entryId },
      data: {
        ...(data.buyIn !== undefined && { buyIn: data.buyIn }),
        ...(data.cashOut !== undefined && { cashOut: data.cashOut }),
      },
      include: {
        player: true,
      },
    });
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

    return prisma.sessionEntry.create({
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
  }
}

export const sessionService = new SessionService();

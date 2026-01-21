/**
 * Live Session Service
 *
 * Handles real-time poker session tracking:
 * - Start sessions with initial players
 * - Track rebuys during gameplay
 * - Add players mid-game
 * - End sessions with settlements
 */

import { PrismaClient } from '@prisma/client';
import { calculateSessionSettlements } from './settlementService';

const prisma = new PrismaClient();

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
      throw new Error('At least 2 players required to start a session');
    }

    // Check for duplicate players
    const playerIds = data.players.map(p => p.playerId);
    const uniquePlayerIds = new Set(playerIds);
    if (playerIds.length !== uniquePlayerIds.size) {
      throw new Error('Duplicate players not allowed');
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

    // Update buy-in (add rebuy amount)
    const updatedEntry = await prisma.sessionEntry.update({
      where: { id: entry.id },
      data: {
        buyIn: entry.buyIn + amount,
      },
      include: {
        player: true,
      },
    });

    return updatedEntry;
  }

  /**
   * Add a new player to an in-progress session
   */
  async addPlayer(sessionId: string, playerId: string, buyIn: number) {
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

    // Validate all players have cash-outs
    const cashOutMap = new Map(data.cashOuts.map(c => [c.playerId, c.cashOut]));

    for (const entry of session.entries) {
      if (!cashOutMap.has(entry.playerId)) {
        throw new Error(`Missing cash-out for player: ${entry.player.name}`);
      }
    }

    // Update all entries with cash-outs
    await Promise.all(
      session.entries.map(entry =>
        prisma.sessionEntry.update({
          where: { id: entry.id },
          data: {
            cashOut: cashOutMap.get(entry.playerId)!,
          },
        })
      )
    );

    // Fetch updated entries for settlement calculation
    const updatedEntries = await prisma.sessionEntry.findMany({
      where: { sessionId },
      include: {
        player: true,
      },
    });

    // Calculate settlements
    const settlements = calculateSessionSettlements(
      updatedEntries.map(e => ({
        playerId: e.playerId,
        playerName: e.player.name,
        buyIn: e.buyIn,
        cashOut: e.cashOut,
      }))
    );

    // Update session status and store settlements
    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime: data.endTime,
        settlements: JSON.stringify(settlements),
      },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });

    return {
      session: updatedSession,
      settlements,
    };
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

    // Check if within 24 hours
    const completedAt = session.updatedAt;
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

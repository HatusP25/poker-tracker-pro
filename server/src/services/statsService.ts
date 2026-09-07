import { prisma } from '../lib/prisma';
import {
  PlayerStats,
  LeaderboardEntry,
  LeaderboardTimeframe,
  SessionStats,
  DashboardStats,
  BalanceCheck,
} from '../types';
import {
  COMPLETED_SESSION_FILTER,
  computeBalanceCheck,
  computeDashboardStats,
  computeLeaderboard,
  computePerformanceTrend,
  computePlayerStats,
  computePlayerStreaks,
  computeSessionStats,
  getTimeframeStart,
  type PlayerEntryRow,
  type PlayerStreakSummary,
  type RosterPlayerRow,
  type TrendPoint,
} from './statsRules';

// Re-exported so both keep their original import paths.
export { getTimeframeStart, COMPLETED_SESSION_FILTER } from './statsRules';

/**
 * Stats endpoints: fetch rows, delegate the arithmetic to `statsRules`.
 *
 * Every group-history query is scoped by `COMPLETED_SESSION_FILTER`. Single-session
 * endpoints (`getSessionStats`, `checkSessionBalance`) deliberately are not — they
 * are asked about one specific session, including one still in progress.
 */
export class StatsService {
  /**
   * Get comprehensive statistics for a single player
   */
  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        entries: {
          where: { session: COMPLETED_SESSION_FILTER },
          include: { session: { select: { date: true } } },
        },
        group: { select: { defaultBuyIn: true } },
      },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    // Recorded rebuy events per night; the pure function falls back to
    // reconstructing them from the buy-in for nights that recorded none.
    const recordedRebuys = await prisma.rebuyEvent.groupBy({
      by: ['sessionId'],
      where: { playerId, session: COMPLETED_SESSION_FILTER },
      _count: { _all: true },
    });
    const recordedBySession = new Map(recordedRebuys.map((r) => [r.sessionId, r._count._all]));

    const entries: PlayerEntryRow[] = player.entries.map((e) => ({
      sessionId: e.sessionId,
      date: e.session.date,
      buyIn: e.buyIn,
      cashOut: e.cashOut,
      recordedRebuyCount: recordedBySession.get(e.sessionId) ?? 0,
    }));

    return computePlayerStats(player.id, player.name, entries, player.group.defaultBuyIn);
  }

  /**
   * Get leaderboard for a group
   * Single query with includes - NO N+1 problem.
   */
  async getLeaderboard(
    groupId: string,
    minGames = 0,
    timeframe: LeaderboardTimeframe = 'all'
  ): Promise<LeaderboardEntry[]> {
    const timeframeStart = getTimeframeStart(timeframe, new Date());

    // F-14: the standings are a derived surface — deactivated players are absent.
    const players = await prisma.player.findMany({
      where: { groupId, isActive: true },
      include: {
        entries: {
          where: {
            session: {
              ...COMPLETED_SESSION_FILTER,
              ...(timeframeStart ? { date: { gte: timeframeStart } } : {}),
            },
          },
          include: { session: { select: { date: true } } },
        },
      },
    });

    const rows: RosterPlayerRow[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      isActive: p.isActive,
      entries: p.entries.map((e) => ({
        sessionId: e.sessionId,
        date: e.session.date,
        buyIn: e.buyIn,
        cashOut: e.cashOut,
      })),
    }));

    return computeLeaderboard(rows, minGames);
  }

  /**
   * Get statistics for a single session (in-progress included — it is about that
   * one session, not the group's history).
   */
  async getSessionStats(sessionId: string): Promise<SessionStats> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { entries: { include: { player: { select: { name: true } } } } },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return computeSessionStats({
      id: session.id,
      date: session.date,
      entries: session.entries.map((e) => ({
        playerId: e.playerId,
        playerName: e.player.name,
        buyIn: e.buyIn,
        cashOut: e.cashOut,
      })),
    });
  }

  /**
   * Get dashboard overview statistics for a group
   */
  async getDashboardStats(groupId: string): Promise<DashboardStats> {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        players: { select: { id: true, isActive: true } },
        sessions: {
          where: COMPLETED_SESSION_FILTER,
          include: { entries: { include: { player: { select: { name: true } } } } },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    const leaderboard = await this.getLeaderboard(groupId);

    return computeDashboardStats({
      sessions: group.sessions.map((s) => ({
        id: s.id,
        date: s.date,
        entries: s.entries.map((e) => ({
          playerId: e.playerId,
          playerName: e.player.name,
          buyIn: e.buyIn,
          cashOut: e.cashOut,
        })),
      })),
      players: group.players,
      leaderboard,
      // The recent-night winner is a per-player callout (F-14); pot and player
      // count stay whole.
      activePlayerIds: new Set(group.players.filter((p) => p.isActive).map((p) => p.id)),
    });
  }

  /**
   * Check if a session is balanced (in-progress included, by design — this is the
   * zero-sum check the live table itself relies on).
   */
  async checkSessionBalance(sessionId: string, threshold = 1): Promise<BalanceCheck> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { entries: { select: { buyIn: true, cashOut: true } } },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return computeBalanceCheck(session.id, session.entries, threshold);
  }

  /**
   * Get player streaks (current win/loss streaks)
   */
  async getPlayerStreaks(groupId: string): Promise<PlayerStreakSummary[]> {
    const players = await prisma.player.findMany({
      where: { groupId, isActive: true },
      include: {
        entries: {
          where: { session: COMPLETED_SESSION_FILTER },
          include: { session: { select: { date: true } } },
        },
      },
    });

    return computePlayerStreaks(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        entries: p.entries.map((e) => ({
          sessionId: e.sessionId,
          date: e.session.date,
          buyIn: e.buyIn,
          cashOut: e.cashOut,
        })),
      }))
    );
  }

  /**
   * Get player performance trend (cumulative profit over time)
   */
  async getPlayerPerformanceTrend(playerId: string): Promise<TrendPoint[]> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        entries: {
          where: { session: COMPLETED_SESSION_FILTER },
          include: { session: { select: { date: true } } },
        },
      },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    return computePerformanceTrend(
      player.entries.map((e) => ({
        sessionId: e.sessionId,
        date: e.session.date,
        buyIn: e.buyIn,
        cashOut: e.cashOut,
      }))
    );
  }
}

export const statsService = new StatsService();

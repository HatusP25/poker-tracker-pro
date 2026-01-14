import { PrismaClient } from '@prisma/client';
import {
  PlayerStats,
  LeaderboardEntry,
  SessionStats,
  DashboardStats,
  BalanceCheck,
} from '../types';
import {
  calculateProfit,
  calculateRebuys,
  calculateROI,
  calculateWinRate,
  calculateAvgProfit,
  isSessionBalanced,
  calculateStreak,
  calculateLongestWinStreak,
  calculateLongestLossStreak,
  round,
} from '../utils/calculations';

const prisma = new PrismaClient();

export class StatsService {
  /**
   * Get comprehensive statistics for a single player
   */
  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        entries: {
          include: {
            session: true,
          },
        },
        group: true,
      },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    const entries = player.entries;
    const totalGames = entries.length;

    if (totalGames === 0) {
      return {
        playerId: player.id,
        playerName: player.name,
        totalGames: 0,
        totalBuyIn: 0,
        totalCashOut: 0,
        balance: 0,
        roi: 0,
        winRate: 0,
        avgProfit: 0,
        avgBuyIn: 0,
        cashOutRate: 0,
        recentFormWinRate: 0,
        winningSessionsCount: 0,
        losingSessionsCount: 0,
        breakEvenSessionsCount: 0,
        bestSession: 0,
        worstSession: 0,
        totalRebuys: 0,
        rebuyRate: 0,
        currentStreak: { type: 'none', count: 0 },
        longestWinStreak: 0,
        longestLossStreak: 0,
      };
    }

    const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = entries.reduce((sum, e) => sum + e.cashOut, 0);
    const balance = totalCashOut - totalBuyIn;

    const sessionResults = entries.map(e => ({
      profit: calculateProfit(e.cashOut, e.buyIn),
      date: e.session.date,
    }));

    const winningSessionsCount = sessionResults.filter(r => r.profit > 0).length;
    const losingSessionsCount = sessionResults.filter(r => r.profit < 0).length;
    const breakEvenSessionsCount = sessionResults.filter(r => r.profit === 0).length;

    const profits = sessionResults.map(r => r.profit);
    const bestSession = profits.length > 0 ? Math.max(...profits) : 0;
    const worstSession = profits.length > 0 ? Math.min(...profits) : 0;

    const totalRebuys = entries.reduce(
      (sum, e) => sum + calculateRebuys(e.buyIn, player.group.defaultBuyIn),
      0
    );

    const currentStreak = calculateStreak(sessionResults);
    const longestWinStreak = calculateLongestWinStreak(sessionResults);
    const longestLossStreak = calculateLongestLossStreak(sessionResults);

    // Calculate new metrics
    const avgBuyIn = totalGames > 0 ? totalBuyIn / totalGames : 0;
    const cashOutRate = totalBuyIn > 0 ? (totalCashOut / totalBuyIn) * 100 : 0;
    const rebuyRate = totalGames > 0 ? (totalRebuys / totalGames) * 100 : 0;

    // Calculate recent form (last 5 games)
    const last5Games = sessionResults.slice(-5);
    const last5Wins = last5Games.filter(r => r.profit > 0).length;
    const recentFormWinRate = last5Games.length > 0 ? (last5Wins / last5Games.length) * 100 : 0;

    return {
      playerId: player.id,
      playerName: player.name,
      totalGames,
      totalBuyIn: round(totalBuyIn),
      totalCashOut: round(totalCashOut),
      balance: round(balance),
      roi: round(calculateROI(totalCashOut, totalBuyIn)),
      winRate: round(calculateWinRate(winningSessionsCount, totalGames)),
      avgProfit: round(calculateAvgProfit(balance, totalGames)),
      avgBuyIn: round(avgBuyIn),
      cashOutRate: round(cashOutRate),
      recentFormWinRate: round(recentFormWinRate),
      winningSessionsCount,
      losingSessionsCount,
      breakEvenSessionsCount,
      bestSession: round(bestSession),
      worstSession: round(worstSession),
      totalRebuys: round(totalRebuys),
      rebuyRate: round(rebuyRate),
      currentStreak,
      longestWinStreak,
      longestLossStreak,
    };
  }

  /**
   * Get leaderboard for a group
   * OPTIMIZED: Single query with includes - NO N+1 problem
   * Fetches all players with their entries and sessions in one database call
   */
  async getLeaderboard(groupId: string, minGames = 0): Promise<LeaderboardEntry[]> {
    // Single optimized query - fetches all data at once
    const players = await prisma.player.findMany({
      where: { groupId },
      include: {
        entries: {
          include: {
            session: true,
          },
        },
        group: true,
      },
    });

    const leaderboard: LeaderboardEntry[] = [];

    for (const player of players) {
      const entries = player.entries;
      const totalGames = entries.length;

      if (totalGames < minGames) {
        continue;
      }

      const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);
      const totalCashOut = entries.reduce((sum, e) => sum + e.cashOut, 0);
      const balance = totalCashOut - totalBuyIn;

      const sessionResults = entries.map(e => ({
        profit: calculateProfit(e.cashOut, e.buyIn),
        date: e.session.date,
      }));

      const winningSessionsCount = sessionResults.filter(r => r.profit > 0).length;

      // Calculate best session and recent form
      const profits = sessionResults.map(r => r.profit);
      const bestSession = profits.length > 0 ? Math.max(...profits) : 0;

      const last5Games = sessionResults.slice(-5);
      const last5Wins = last5Games.filter(r => r.profit > 0).length;
      const recentFormWinRate = last5Games.length > 0 ? (last5Wins / last5Games.length) * 100 : 0;

      leaderboard.push({
        rank: 0, // Will be set after sorting
        playerId: player.id,
        playerName: player.name,
        totalGames,
        totalBuyIn: round(totalBuyIn),
        totalCashOut: round(totalCashOut),
        balance: round(balance),
        roi: round(calculateROI(totalCashOut, totalBuyIn)),
        winRate: round(calculateWinRate(winningSessionsCount, totalGames)),
        avgProfit: round(calculateAvgProfit(balance, totalGames)),
        bestSession: round(bestSession),
        recentFormWinRate: round(recentFormWinRate),
        currentStreak: calculateStreak(sessionResults),
        isActive: player.isActive,
      });
    }

    // Sort by balance (descending) and assign ranks
    leaderboard.sort((a, b) => b.balance - a.balance);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  }

  /**
   * Get statistics for a single session
   */
  async getSessionStats(sessionId: string): Promise<SessionStats> {
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

    const totalBuyIn = session.entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = session.entries.reduce((sum, e) => sum + e.cashOut, 0);
    const balance = totalCashOut - totalBuyIn;

    const entriesWithProfit = session.entries.map(e => ({
      ...e,
      profit: calculateProfit(e.cashOut, e.buyIn),
    }));

    const sorted = [...entriesWithProfit].sort((a, b) => b.profit - a.profit);
    const biggestWinner = sorted.length > 0 && sorted[0].profit > 0
      ? {
          playerId: sorted[0].playerId,
          playerName: sorted[0].player.name,
          profit: round(sorted[0].profit),
        }
      : null;

    const biggestLoser = sorted.length > 0 && sorted[sorted.length - 1].profit < 0
      ? {
          playerId: sorted[sorted.length - 1].playerId,
          playerName: sorted[sorted.length - 1].player.name,
          profit: round(sorted[sorted.length - 1].profit),
        }
      : null;

    return {
      sessionId: session.id,
      date: session.date,
      playerCount: session.entries.length,
      totalBuyIn: round(totalBuyIn),
      totalCashOut: round(totalCashOut),
      balance: round(balance),
      isBalanced: isSessionBalanced(totalBuyIn, totalCashOut),
      biggestWinner,
      biggestLoser,
    };
  }

  /**
   * Get dashboard overview statistics for a group
   */
  async getDashboardStats(groupId: string): Promise<DashboardStats> {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        players: true,
        sessions: {
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
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    const totalSessions = group.sessions.length;
    const totalPlayers = group.players.length;
    const activePlayers = group.players.filter(p => p.isActive).length;

    // Get leaderboard once and reuse for both netGroupProfit and topPlayers
    const leaderboard = await this.getLeaderboard(groupId);
    const netGroupProfit = leaderboard.reduce((sum, p) => sum + p.balance, 0);

    // Calculate average session size (average pot)
    const totalBuyIns = group.sessions.reduce(
      (sum, s) => sum + s.entries.reduce((entrySum, e) => entrySum + e.buyIn, 0),
      0
    );
    const avgSessionSize = totalSessions > 0 ? totalBuyIns / totalSessions : 0;

    const lastSessionDate = group.sessions.length > 0 ? group.sessions[0].date : null;

    // Get top 3 players from already-fetched leaderboard
    const topPlayers = leaderboard.slice(0, 3).map(p => ({
      playerId: p.playerId,
      playerName: p.playerName,
      balance: p.balance,
      roi: p.roi,
      totalGames: p.totalGames,
    }));

    // Get recent 5 sessions
    const recentSessions = group.sessions.slice(0, 5).map(s => {
      const entriesWithProfit = s.entries.map(e => ({
        ...e,
        profit: calculateProfit(e.cashOut, e.buyIn),
      }));
      const winner = entriesWithProfit.reduce((max, e) =>
        e.profit > max.profit ? e : max
      );

      return {
        sessionId: s.id,
        date: s.date,
        playerCount: s.entries.length,
        winner: winner.player.name,
        totalPot: round(s.entries.reduce((sum, e) => sum + e.buyIn, 0)),
      };
    });

    return {
      totalSessions,
      totalPlayers,
      activePlayers,
      netGroupProfit: round(netGroupProfit),
      avgSessionSize: round(avgSessionSize),
      lastSessionDate,
      topPlayers,
      recentSessions,
    };
  }

  /**
   * Check if a session is balanced
   */
  async checkSessionBalance(sessionId: string, threshold = 1): Promise<BalanceCheck> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        entries: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const totalBuyIn = session.entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = session.entries.reduce((sum, e) => sum + e.cashOut, 0);
    const difference = totalCashOut - totalBuyIn;

    return {
      sessionId: session.id,
      totalBuyIn: round(totalBuyIn),
      totalCashOut: round(totalCashOut),
      difference: round(difference),
      isBalanced: isSessionBalanced(totalBuyIn, totalCashOut, threshold),
      threshold,
    };
  }
}

export const statsService = new StatsService();

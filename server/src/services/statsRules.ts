import {
  PlayerStats,
  LeaderboardEntry,
  LeaderboardTimeframe,
  SessionStats,
  DashboardStats,
  BalanceCheck,
} from '../types';
import {
  calculateProfit,
  calculateROI,
  calculateWinRate,
  calculateAvgProfit,
  isSessionBalanced,
  calculateStreak,
  calculateLongestWinStreak,
  calculateLongestLossStreak,
  round,
} from '../utils/calculations';
import { resolveRebuyCount } from '../utils/rebuys';

/**
 * Pure computations behind the stats endpoints.
 *
 * These lived inline in `statsService`, interleaved with Prisma calls, which meant
 * the leaderboard, dashboard, player-stats, streak and trend formulas had no direct
 * unit test — only `getTimeframeStart` was exported. Following the convention
 * `insightsService` / `sessionSummaryRules` already use, the service now fetches
 * rows and delegates the arithmetic here, where it is testable without a database.
 *
 * Nothing in this file touches the database or the clock.
 */

/** "Last 5 games" — the window every recent-form figure in the app uses. */
export const RECENT_FORM_WINDOW = 5;

/**
 * The single definition of a session that counts towards statistics.
 *
 * An in-progress session has `cashOut = 0` for everyone still at the table, so
 * including one makes every player present look like a total loss in the
 * leaderboard, records, form and season recap. Soft-deleted sessions never counted;
 * in-progress ones silently did.
 */
export const COMPLETED_SESSION_FILTER = { deletedAt: null, status: 'COMPLETED' } as const;

/**
 * Compute the inclusive start date for a leaderboard timeframe, relative to `now`.
 * Returns null for 'all' (no filtering).
 *
 * - 'year'  -> Jan 1 of the current year (YTD)
 * - 'month' -> 1st of the current month
 * - 'week'  -> start of the current week, Sunday-based
 */
export function getTimeframeStart(timeframe: LeaderboardTimeframe, now: Date): Date | null {
  switch (timeframe) {
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    }
    case 'all':
    default:
      return null;
  }
}

// ---- Row shapes (already fetched, DB-agnostic so unit tests need no database) ----

/** One night in a single player's history. */
export interface PlayerEntryRow {
  sessionId: string;
  date: Date;
  buyIn: number;
  cashOut: number;
  /** RebuyEvent rows recorded for this player that night; 0 when none were. */
  recordedRebuyCount?: number;
}

/** A group member plus their history — the shape `getLeaderboard` fetches. */
export interface RosterPlayerRow {
  id: string;
  name: string;
  isActive: boolean;
  entries: PlayerEntryRow[];
}

export interface SessionEntryRow {
  playerId: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
}

export interface StatsSessionRow {
  id: string;
  date: Date;
  entries: SessionEntryRow[];
}

export interface PlayerStreakSummary {
  playerId: string;
  playerName: string;
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface TrendPoint {
  date: string;
  sessionProfit: number;
  cumulativeProfit: number;
}

// ---- Ordering helpers ----

/**
 * Oldest -> newest, ties on the same date broken by session id.
 *
 * "Recent form" used to slice `entries.slice(-5)` on rows fetched with no
 * `orderBy`, so "the last 5 games" was whatever order Postgres happened to return.
 * Every window in this file goes through here instead.
 */
export function chronological<T extends { date: Date; sessionId: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || a.sessionId.localeCompare(b.sessionId)
  );
}

export function toSessionResults(
  entries: PlayerEntryRow[]
): Array<{ profit: number; date: Date }> {
  return entries.map((e) => ({ profit: calculateProfit(e.cashOut, e.buyIn), date: e.date }));
}

/** Win rate across the chronologically most recent `window` nights, as a percentage. */
export function computeRecentFormWinRate(
  entries: PlayerEntryRow[],
  window = RECENT_FORM_WINDOW
): number {
  const recent = chronological(entries).slice(-window);
  if (recent.length === 0) return 0;
  const wins = recent.filter((e) => calculateProfit(e.cashOut, e.buyIn) > 0).length;
  return (wins / recent.length) * 100;
}

// ---- Player stats ----

export function emptyPlayerStats(playerId: string, playerName: string): PlayerStats {
  return {
    playerId,
    playerName,
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

export function computePlayerStats(
  playerId: string,
  playerName: string,
  entries: PlayerEntryRow[],
  defaultBuyIn: number
): PlayerStats {
  const totalGames = entries.length;
  if (totalGames === 0) return emptyPlayerStats(playerId, playerName);

  const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);
  const totalCashOut = entries.reduce((sum, e) => sum + e.cashOut, 0);
  const balance = totalCashOut - totalBuyIn;

  const sessionResults = toSessionResults(entries);
  const winningSessionsCount = sessionResults.filter((r) => r.profit > 0).length;
  const losingSessionsCount = sessionResults.filter((r) => r.profit < 0).length;
  const breakEvenSessionsCount = sessionResults.filter((r) => r.profit === 0).length;

  const profits = sessionResults.map((r) => r.profit);
  const bestSession = Math.max(...profits);
  const worstSession = Math.min(...profits);

  // Recorded RebuyEvent rows win; nights that recorded none are reconstructed from
  // the total buy-in. Never buy-in arithmetic directly — that returned *fractions*.
  const totalRebuys = entries.reduce(
    (sum, e) => sum + resolveRebuyCount(e.buyIn, e.recordedRebuyCount ?? 0, defaultBuyIn),
    0
  );

  const avgBuyIn = totalBuyIn / totalGames;
  const cashOutRate = totalBuyIn > 0 ? (totalCashOut / totalBuyIn) * 100 : 0;
  const rebuyRate = (totalRebuys / totalGames) * 100;

  return {
    playerId,
    playerName,
    totalGames,
    totalBuyIn: round(totalBuyIn),
    totalCashOut: round(totalCashOut),
    balance: round(balance),
    roi: round(calculateROI(totalCashOut, totalBuyIn)),
    winRate: round(calculateWinRate(winningSessionsCount, totalGames)),
    avgProfit: round(calculateAvgProfit(balance, totalGames)),
    avgBuyIn: round(avgBuyIn),
    cashOutRate: round(cashOutRate),
    recentFormWinRate: round(computeRecentFormWinRate(entries)),
    winningSessionsCount,
    losingSessionsCount,
    breakEvenSessionsCount,
    bestSession: round(bestSession),
    worstSession: round(worstSession),
    totalRebuys: round(totalRebuys),
    rebuyRate: round(rebuyRate),
    currentStreak: calculateStreak(sessionResults),
    longestWinStreak: calculateLongestWinStreak(sessionResults),
    longestLossStreak: calculateLongestLossStreak(sessionResults),
  };
}

// ---- Leaderboard ----

export function computeLeaderboard(
  players: RosterPlayerRow[],
  minGames = 0
): LeaderboardEntry[] {
  const leaderboard: LeaderboardEntry[] = [];

  for (const player of players) {
    const entries = player.entries;
    const totalGames = entries.length;
    if (totalGames < minGames) continue;

    const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = entries.reduce((sum, e) => sum + e.cashOut, 0);
    const balance = totalCashOut - totalBuyIn;

    const sessionResults = toSessionResults(entries);
    const winningSessionsCount = sessionResults.filter((r) => r.profit > 0).length;
    const profits = sessionResults.map((r) => r.profit);

    leaderboard.push({
      rank: 0, // assigned after sorting
      playerId: player.id,
      playerName: player.name,
      totalGames,
      totalBuyIn: round(totalBuyIn),
      totalCashOut: round(totalCashOut),
      balance: round(balance),
      roi: round(calculateROI(totalCashOut, totalBuyIn)),
      winRate: round(calculateWinRate(winningSessionsCount, totalGames)),
      avgProfit: round(calculateAvgProfit(balance, totalGames)),
      bestSession: round(profits.length > 0 ? Math.max(...profits) : 0),
      recentFormWinRate: round(computeRecentFormWinRate(entries)),
      currentStreak: calculateStreak(sessionResults),
      isActive: player.isActive,
    });
  }

  leaderboard.sort((a, b) => b.balance - a.balance);
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return leaderboard;
}

// ---- Session stats ----

export function computeSessionStats(session: StatsSessionRow): SessionStats {
  const totalBuyIn = session.entries.reduce((sum, e) => sum + e.buyIn, 0);
  const totalCashOut = session.entries.reduce((sum, e) => sum + e.cashOut, 0);

  const sorted = [...session.entries]
    .map((e) => ({ ...e, profit: calculateProfit(e.cashOut, e.buyIn) }))
    .sort((a, b) => b.profit - a.profit);

  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  return {
    sessionId: session.id,
    date: session.date,
    playerCount: session.entries.length,
    totalBuyIn: round(totalBuyIn),
    totalCashOut: round(totalCashOut),
    balance: round(totalCashOut - totalBuyIn),
    isBalanced: isSessionBalanced(totalBuyIn, totalCashOut),
    biggestWinner:
      top && top.profit > 0
        ? { playerId: top.playerId, playerName: top.playerName, profit: round(top.profit) }
        : null,
    biggestLoser:
      bottom && bottom.profit < 0
        ? {
            playerId: bottom.playerId,
            playerName: bottom.playerName,
            profit: round(bottom.profit),
          }
        : null,
  };
}

// ---- Dashboard ----

export interface DashboardInput {
  /** Any order; sorted newest-first here so the caller's fetch order can't leak in. */
  sessions: StatsSessionRow[];
  players: Array<{ isActive: boolean }>;
  leaderboard: LeaderboardEntry[];
  /**
   * F-14: the active roster. The recent-night winner is a per-player callout, so
   * it is picked from active players only. Omit to consider everyone — the
   * night's own facts (playerCount, totalPot) stay whole either way, per D-B.
   */
  activePlayerIds?: ReadonlySet<string>;
}

export function computeDashboardStats({
  sessions,
  players,
  leaderboard,
  activePlayerIds,
}: DashboardInput): DashboardStats {
  const newestFirst = [...sessions].sort((a, b) => b.date.getTime() - a.date.getTime());
  const totalSessions = newestFirst.length;

  const totalBuyIns = newestFirst.reduce(
    (sum, s) => sum + s.entries.reduce((entrySum, e) => entrySum + e.buyIn, 0),
    0
  );

  return {
    totalSessions,
    totalPlayers: players.length,
    activePlayers: players.filter((p) => p.isActive).length,
    netGroupProfit: round(leaderboard.reduce((sum, p) => sum + p.balance, 0)),
    avgSessionSize: round(totalSessions > 0 ? totalBuyIns / totalSessions : 0),
    lastSessionDate: totalSessions > 0 ? newestFirst[0].date : null,
    topPlayers: leaderboard.slice(0, 3).map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      balance: p.balance,
      roi: p.roi,
      totalGames: p.totalGames,
    })),
    recentSessions: newestFirst.slice(0, 5).map((s) => {
      // A session can legitimately have no entries (created, then everyone removed).
      // The old `.reduce()` had no initial value and threw on exactly that row.
      const contenders = activePlayerIds
        ? s.entries.filter((e) => activePlayerIds.has(e.playerId))
        : s.entries;
      const winner = contenders.reduce<SessionEntryRow | null>(
        (best, e) =>
          best === null ||
          calculateProfit(e.cashOut, e.buyIn) > calculateProfit(best.cashOut, best.buyIn)
            ? e
            : best,
        null
      );

      return {
        sessionId: s.id,
        date: s.date,
        playerCount: s.entries.length,
        winner: winner?.playerName ?? '',
        totalPot: round(s.entries.reduce((sum, e) => sum + e.buyIn, 0)),
      };
    }),
  };
}

// ---- Streaks & trend ----

export function computePlayerStreaks(players: RosterPlayerRow[]): PlayerStreakSummary[] {
  return players.map((player) => {
    if (player.entries.length === 0) {
      return {
        playerId: player.id,
        playerName: player.name,
        currentStreak: 0,
        streakType: 'none' as const,
        longestWinStreak: 0,
        longestLossStreak: 0,
      };
    }

    const sessionResults = toSessionResults(player.entries);
    const streakInfo = calculateStreak(sessionResults);

    return {
      playerId: player.id,
      playerName: player.name,
      currentStreak: streakInfo.count,
      streakType: streakInfo.type,
      longestWinStreak: calculateLongestWinStreak(sessionResults),
      longestLossStreak: calculateLongestLossStreak(sessionResults),
    };
  });
}

export function computePerformanceTrend(entries: PlayerEntryRow[]): TrendPoint[] {
  let cumulativeProfit = 0;
  return chronological(entries).map((entry) => {
    const sessionProfit = calculateProfit(entry.cashOut, entry.buyIn);
    cumulativeProfit += sessionProfit;
    return {
      date: entry.date.toISOString().split('T')[0],
      sessionProfit: round(sessionProfit),
      cumulativeProfit: round(cumulativeProfit),
    };
  });
}

export function computeBalanceCheck(
  sessionId: string,
  entries: Array<{ buyIn: number; cashOut: number }>,
  threshold = 1
): BalanceCheck {
  const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);
  const totalCashOut = entries.reduce((sum, e) => sum + e.cashOut, 0);

  return {
    sessionId,
    totalBuyIn: round(totalBuyIn),
    totalCashOut: round(totalCashOut),
    difference: round(totalCashOut - totalBuyIn),
    isBalanced: isSessionBalanced(totalBuyIn, totalCashOut, threshold),
    threshold,
  };
}

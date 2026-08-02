import { round } from '../utils/calculations';

/**
 * Pure computations behind the post-session summary.
 *
 * These were previously interleaved with Prisma calls inside
 * `sessionSummaryService`, which made them untestable without a database and cost
 * one full-history query *per player* — plus a complete ranking recomputation per
 * player inside that loop. Following the `insightsService` convention, the service
 * now fetches the group's sessions once and these functions work over plain rows.
 */

export interface SummaryEntryRow {
  playerId: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
}

export interface SummarySessionRow {
  id: string;
  /** ISO string. */
  date: string;
  /** Tie-breaker for sessions sharing a date. */
  createdAt: string;
  entries: SummaryEntryRow[];
}

export interface RankingChange {
  playerId: string;
  playerName: string;
  oldRank: number;
  newRank: number;
  change: number;
  profit: number;
}

export interface SessionHighlights {
  biggestWinner: { playerId: string; name: string; profit: number };
  biggestLoser: { playerId: string; name: string; profit: number };
  mostRebuys?: { playerId: string; name: string; rebuys: number };
  biggestComeback?: { playerId: string; name: string; description: string };
}

export interface StreakUpdate {
  playerId: string;
  playerName: string;
  type: 'win' | 'loss';
  count: number;
  isNew: boolean;
}

export interface Milestone {
  playerId: string;
  playerName: string;
  type: 'best_session' | 'total_games' | 'total_profit' | 'top_3';
  description: string;
  value?: number;
}

const profitOf = (e: SummaryEntryRow) => e.cashOut - e.buyIn;

/** Chronological order, with createdAt breaking ties so results are deterministic. */
const chronological = (sessions: SummarySessionRow[]): SummarySessionRow[] =>
  [...sessions].sort(
    (a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime() ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

/**
 * Leaderboard position per player across the given sessions.
 * Ranked by total balance, then by games played.
 */
export function computeRankings(sessions: SummarySessionRow[]): Map<string, number> {
  const totals = new Map<string, { balance: number; games: number }>();

  for (const session of sessions) {
    for (const entry of session.entries) {
      const t = totals.get(entry.playerId) ?? { balance: 0, games: 0 };
      t.balance += profitOf(entry);
      t.games += 1;
      totals.set(entry.playerId, t);
    }
  }

  const ranked = [...totals.entries()].sort(
    (a, b) => b[1].balance - a[1].balance || b[1].games - a[1].games
  );

  return new Map(ranked.map(([playerId], i) => [playerId, i + 1]));
}

/** Sessions strictly before (`exclusive`) or up to and including a cutoff date. */
export function sessionsUpTo(
  sessions: SummarySessionRow[],
  cutoff: string,
  exclusive: boolean
): SummarySessionRow[] {
  const at = new Date(cutoff).getTime();
  return sessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return exclusive ? t < at : t <= at;
  });
}

export function computeRankingChanges(
  entries: SummaryEntryRow[],
  before: Map<string, number>,
  after: Map<string, number>
): RankingChange[] {
  const changes = entries.map((entry) => {
    const oldRank = before.get(entry.playerId) ?? 0; // 0 = didn't exist yet
    const newRank = after.get(entry.playerId) ?? 0;
    return {
      playerId: entry.playerId,
      playerName: entry.playerName,
      oldRank,
      newRank,
      // Positive = moved up. A brand-new player hasn't moved.
      change: oldRank === 0 ? 0 : oldRank - newRank,
      profit: round(profitOf(entry)),
    };
  });

  return changes.sort((a, b) => {
    if (a.newRank === 0) return 1;
    if (b.newRank === 0) return -1;
    return a.newRank - b.newRank;
  });
}

export function computeHighlights(
  entries: SummaryEntryRow[],
  rebuysByPlayer: Map<string, number>
): SessionHighlights {
  if (entries.length === 0) {
    return {
      biggestWinner: { playerId: '', name: 'N/A', profit: 0 },
      biggestLoser: { playerId: '', name: 'N/A', profit: 0 },
    };
  }

  let winner = entries[0];
  let loser = entries[0];
  for (const entry of entries) {
    if (profitOf(entry) > profitOf(winner)) winner = entry;
    if (profitOf(entry) < profitOf(loser)) loser = entry;
  }

  const highlights: SessionHighlights = {
    biggestWinner: {
      playerId: winner.playerId,
      name: winner.playerName,
      profit: round(profitOf(winner)),
    },
    biggestLoser: {
      playerId: loser.playerId,
      name: loser.playerName,
      profit: round(profitOf(loser)),
    },
  };

  let mostRebuys: SummaryEntryRow | null = null;
  let maxRebuys = 0;
  for (const entry of entries) {
    const rebuys = rebuysByPlayer.get(entry.playerId) ?? 0;
    if (rebuys > maxRebuys) {
      maxRebuys = rebuys;
      mostRebuys = entry;
    }
  }

  if (mostRebuys && maxRebuys > 0) {
    highlights.mostRebuys = {
      playerId: mostRebuys.playerId,
      name: mostRebuys.playerName,
      rebuys: maxRebuys,
    };
  }

  return highlights;
}

/** Look-back window for streak detection, matching the previous implementation. */
const STREAK_LOOKBACK = 10;
/** Streaks shorter than this aren't worth reporting. */
const STREAK_MIN = 2;

export function computeStreakUpdates(
  history: SummarySessionRow[],
  entries: SummaryEntryRow[],
  cutoff: string
): StreakUpdate[] {
  const upTo = sessionsUpTo(history, cutoff, false);
  const streaks: StreakUpdate[] = [];

  for (const entry of entries) {
    const profit = profitOf(entry);
    if (profit === 0) continue; // break-even is neither a win nor a loss

    // This player's recent results, newest first.
    const results = chronological(upTo)
      .filter((s) => s.entries.some((e) => e.playerId === entry.playerId))
      .reverse()
      .slice(0, STREAK_LOOKBACK)
      .map((s) => profitOf(s.entries.find((e) => e.playerId === entry.playerId)!));

    const type: 'win' | 'loss' = profit > 0 ? 'win' : 'loss';

    let count = 0;
    for (const p of results) {
      if (p === 0) continue;
      if ((p > 0 ? 'win' : 'loss') !== type) break;
      count++;
    }

    if (count < STREAK_MIN) continue;

    // "New" means the run started tonight — the previous night went the other way.
    let isNew = true;
    if (results.length > 1) {
      const prev = results[1];
      const prevType = prev === 0 ? null : prev > 0 ? 'win' : 'loss';
      isNew = prevType !== null && prevType !== type;
    }

    streaks.push({
      playerId: entry.playerId,
      playerName: entry.playerName,
      type,
      count,
      isNew,
    });
  }

  return streaks;
}

const GAME_MILESTONES = [10, 25, 50, 100];
/** Tuned for a low-stakes home game. */
const PROFIT_MILESTONES = [50, 100, 250, 500];

export function computeMilestones(
  history: SummarySessionRow[],
  entries: SummaryEntryRow[],
  cutoff: string,
  rankingsBefore: Map<string, number>,
  rankingsAfter: Map<string, number>
): Milestone[] {
  const upTo = sessionsUpTo(history, cutoff, false);
  const milestones: Milestone[] = [];

  for (const entry of entries) {
    const profit = profitOf(entry);

    const played = upTo
      .filter((s) => s.entries.some((e) => e.playerId === entry.playerId))
      .map((s) => profitOf(s.entries.find((e) => e.playerId === entry.playerId)!));

    const totalGames = played.length;
    const totalProfit = played.reduce((sum, p) => sum + p, 0);
    const bestSession = played.length ? Math.max(...played) : profit;

    if (profit > 0 && profit === bestSession) {
      milestones.push({
        playerId: entry.playerId,
        playerName: entry.playerName,
        type: 'best_session',
        description: 'Best session ever!',
        value: round(profit),
      });
    }

    for (const m of GAME_MILESTONES) {
      if (totalGames === m) {
        milestones.push({
          playerId: entry.playerId,
          playerName: entry.playerName,
          type: 'total_games',
          description: `${m} games played!`,
          value: m,
        });
      }
    }

    for (const m of PROFIT_MILESTONES) {
      // Crossed tonight: at or above now, below it before this session.
      if (totalProfit >= m && totalProfit - profit < m) {
        milestones.push({
          playerId: entry.playerId,
          playerName: entry.playerName,
          type: 'total_profit',
          description: `Crossed $${m} total profit!`,
          value: m,
        });
      }
    }

    const rank = rankingsAfter.get(entry.playerId);
    if (rank && rank <= 3) {
      const prevRank = rankingsBefore.get(entry.playerId);
      if (!prevRank || prevRank > 3) {
        milestones.push({
          playerId: entry.playerId,
          playerName: entry.playerName,
          type: 'top_3',
          description: 'Made it to top 3!',
          value: rank,
        });
      }
    }
  }

  return milestones;
}

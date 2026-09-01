import { parseLocalDate } from '@/lib/dateUtils';
import type {
  LeaderboardEntry,
  LeaderboardTimeframe,
  Player,
  Season,
  Session,
} from '@/types';

/**
 * The standings board's arithmetic.
 *
 * Why the client computes this at all, when `/stats/groups/:id/leaderboard`
 * exists: the endpoint takes `all | year | month | week` and nothing else, and
 * the group now defines its own **seasons**. Scoping the board to "Winter
 * 2025/26" needs an arbitrary date window, which the API cannot express. The
 * alternatives were a second code path for seasons only — the leaderboard from
 * the server for four timeframes and something else for the fifth, guaranteed
 * to drift — or one computation used by every timeframe. This is that one.
 *
 * It mirrors `server/src/services/statsRules.ts#computeLeaderboard` field for
 * field, including the parts that are easy to get subtly wrong:
 *   - a win is `profit > 0`, so a break-even night is not a win;
 *   - `bestSession` is the honest maximum and may be negative;
 *   - "last five" is five in *date* order, not five in fetch order;
 *   - streaks read back from the most recent night and stop at a flat one.
 * It also applies D-006 — a night counts only when it is COMPLETED and not
 * soft-deleted — which the sessions endpoint leaves to the caller.
 *
 * Verified against the live endpoint for this group: every field and the whole
 * ordering agree. The one deliberate divergence is `currentStreak` when a group
 * played **twice on the same date**. `utils/calculations.ts#calculateStreak`
 * sorts by date alone, so which of the two nights it treats as most recent is
 * whatever order Postgres returned the rows in; this sorts ties by session id,
 * the same rule `statsRules.chronological` uses everywhere else. Deterministic
 * beats matching an arbitrary result.
 *
 * Everything here is pure: no React, no clock (the caller passes `now`), no
 * network. The board's shape is decided in one tested place and the components
 * only draw it.
 */

// ---- Rows -------------------------------------------------------------------

/** One night in a single player's window, oldest first. */
export interface StandingsNight {
  sessionId: string;
  date: string;
  profit: number;
}

export interface StandingsRow {
  /** Position in the *current* ordering. Recomputed on every sort — see below. */
  rank: number;
  playerId: string;
  playerName: string;
  nickname: string | null;
  isActive: boolean;

  totalGames: number;
  totalBuyIn: number;
  totalCashOut: number;
  balance: number;
  avgProfit: number;
  winRate: number;
  /** Demoted, not deleted (D-002): detail drawer and CSV only. */
  roi: number;
  bestSession: number;
  worstSession: number;
  recentFormWinRate: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };

  /** Chronological, for the form sparkline. */
  nights: StandingsNight[];
  /** Cleared the minimum-nights floor for this window. */
  qualified: boolean;
}

// ---- Scope ------------------------------------------------------------------

export type StandingsScope =
  | { kind: 'timeframe'; timeframe: LeaderboardTimeframe }
  | { kind: 'season'; season: Season };

export interface DateWindow {
  start: Date | null;
  end: Date | null;
}

/**
 * The date bracket a scope selects.
 *
 * The four timeframes reproduce `statsRules.getTimeframeStart` exactly, so
 * switching a group between the two sources of truth cannot move a night.
 * Seasons are inclusive of their last day: a night stored at midnight on the
 * closing date belongs to the season that closes on it.
 */
export function scopeWindow(scope: StandingsScope, now: Date = new Date()): DateWindow {
  if (scope.kind === 'season') {
    const start = parseLocalDate(scope.season.startDate);
    const end = parseLocalDate(scope.season.endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  switch (scope.timeframe) {
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: null };
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: null };
    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return { start: weekStart, end: null };
    }
    case 'all':
    default:
      return { start: null, end: null };
  }
}

// ---- Qualification ----------------------------------------------------------

/**
 * How many nights it takes to appear in the ranked board.
 *
 * There was no floor at all, so a player who turned up once and won $30 sat
 * above a regular of forty nights — which reads as a broken table rather than
 * a standing. A fifth of the group's history, capped at five, is enough to
 * mean something without excluding anyone who actually shows up.
 */
export function qualifyingThreshold(sessionCount: number): number {
  if (!Number.isFinite(sessionCount) || sessionCount < 5) return 1;
  return Math.min(5, Math.max(1, Math.round(sessionCount * 0.2)));
}

// ---- Sorting ----------------------------------------------------------------

export type StandingsSortKey =
  | 'balance'
  | 'games'
  | 'winRate'
  | 'bestSession'
  | 'avgProfit'
  | 'roi'
  | 'name';

export type SortDirection = 'asc' | 'desc';

export interface StandingsSort {
  key: StandingsSortKey;
  /** The picker's option. */
  label: string;
  /** The line under the board: "Ranked by …". */
  rankedBy: string;
  /** What the podium's eyebrow calls the leader. */
  leaderLabel: string;
  /** Alphabetical sorts read ascending; every figure reads descending. */
  defaultDirection: SortDirection;
  /** True only for the money standings, which is the one with a trophy on it. */
  canonical?: boolean;
}

/**
 * The orderings the board offers. Balance first, because that is the standing;
 * ROI last, because it is a grinder metric that should have to be asked for
 * (D-002 demotes it rather than deleting it).
 */
export const SORTS: readonly StandingsSort[] = [
  {
    key: 'balance',
    label: 'Balance',
    rankedBy: 'total balance',
    leaderLabel: 'Champion',
    defaultDirection: 'desc',
    canonical: true,
  },
  {
    key: 'games',
    label: 'Nights played',
    rankedBy: 'nights played',
    leaderLabel: 'Most nights',
    defaultDirection: 'desc',
  },
  {
    key: 'winRate',
    label: 'Win rate',
    rankedBy: 'win rate',
    leaderLabel: 'Best win rate',
    defaultDirection: 'desc',
  },
  {
    key: 'bestSession',
    label: 'Best night',
    rankedBy: 'biggest single night',
    leaderLabel: 'Biggest night',
    defaultDirection: 'desc',
  },
  {
    key: 'avgProfit',
    label: 'Per night',
    rankedBy: 'average per night',
    leaderLabel: 'Best per night',
    defaultDirection: 'desc',
  },
  {
    key: 'roi',
    label: 'ROI',
    rankedBy: 'return on buy-ins',
    leaderLabel: 'Best ROI',
    defaultDirection: 'desc',
  },
  {
    key: 'name',
    label: 'Name',
    rankedBy: 'name',
    leaderLabel: 'First alphabetically',
    defaultDirection: 'asc',
  },
];

export const sortByKey = (key: StandingsSortKey): StandingsSort =>
  SORTS.find((s) => s.key === key) ?? SORTS[0];

const NUMERIC: Record<Exclude<StandingsSortKey, 'name'>, (row: StandingsRow) => number> = {
  balance: (r) => r.balance,
  games: (r) => r.totalGames,
  winRate: (r) => r.winRate,
  bestSession: (r) => r.bestSession,
  avgProfit: (r) => r.avgProfit,
  roi: (r) => r.roi,
};

/**
 * A comparator, not a sorter — two components elsewhere in this app call
 * `.sort()` directly on the TanStack Query cache array and mutate it.
 *
 * Ties fall back to balance and then to name, so the board never reshuffles
 * between renders just because two players have played the same number of
 * nights.
 */
export const compareBy =
  (key: StandingsSortKey, direction: SortDirection) =>
  (a: StandingsRow, b: StandingsRow): number => {
    const flip = direction === 'asc' ? -1 : 1;

    if (key === 'name') {
      return -flip * a.playerName.localeCompare(b.playerName);
    }

    const read = NUMERIC[key];
    return (
      flip * (read(b) - read(a)) ||
      b.balance - a.balance ||
      a.playerName.localeCompare(b.playerName)
    );
  };

// ---- The board --------------------------------------------------------------

export interface BuildStandingsInput {
  /** Straight from the sessions endpoint; any order, in-progress and deleted included. */
  sessions: Session[] | undefined;
  players: Player[] | undefined;
  window: DateWindow;
  /** Nights needed to be ranked. Use `qualifyingThreshold(sessionCount)`. */
  minGames: number;
  sort?: StandingsSortKey;
  direction?: SortDirection;
}

export interface Standings {
  /** Qualified players in the current ordering, ranked 1..n. */
  rows: StandingsRow[];
  /** Played, but under the floor. Shown below the board, unranked. */
  unranked: StandingsRow[];
  /** On the roster, no nights in this window at all. */
  absent: StandingsRow[];
  /** Completed, non-deleted nights inside the window. */
  sessionCount: number;
  minGames: number;
  sort: StandingsSort;
  direction: SortDirection;
}

const round2 = (value: number): number =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;

/** D-006, applied to the raw session list the endpoint hands back. */
const counts = (session: Session, window: DateWindow): boolean => {
  if (session.deletedAt) return false;
  if (session.status !== 'COMPLETED') return false;
  const at = parseLocalDate(session.date).getTime();
  if (window.start && at < window.start.getTime()) return false;
  if (window.end && at > window.end.getTime()) return false;
  return true;
};

/** Oldest first, ties on a date broken by session id — the app's one ordering. */
const chronological = (nights: Array<StandingsNight & { buyIn: number; cashOut: number }>) =>
  [...nights].sort(
    (a, b) =>
      parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime() ||
      a.sessionId.localeCompare(b.sessionId)
  );

const streakOf = (profits: number[]): StandingsRow['currentStreak'] => {
  if (profits.length === 0) return { type: 'none', count: 0 };
  const latest = profits[profits.length - 1];
  if (latest === 0) return { type: 'none', count: 0 };
  const type = latest > 0 ? 'win' : 'loss';
  let count = 0;
  for (let i = profits.length - 1; i >= 0; i--) {
    const isSame = type === 'win' ? profits[i] > 0 : profits[i] < 0;
    if (!isSame) break;
    count++;
  }
  return { type, count };
};

/** The window every "recent form" figure in this app uses. */
export const RECENT_FORM_WINDOW = 5;

export function buildStandings({
  sessions,
  players,
  window,
  minGames,
  sort = 'balance',
  direction,
}: BuildStandingsInput): Standings {
  const descriptor = sortByKey(sort);
  const dir = direction ?? descriptor.defaultDirection;

  const counted = (sessions ?? []).filter((s) => counts(s, window));

  const byPlayer = new Map<
    string,
    Array<StandingsNight & { buyIn: number; cashOut: number }>
  >();
  for (const session of counted) {
    for (const entry of session.entries ?? []) {
      const list = byPlayer.get(entry.playerId) ?? [];
      list.push({
        sessionId: session.id,
        date: session.date,
        buyIn: entry.buyIn,
        cashOut: entry.cashOut,
        profit: entry.cashOut - entry.buyIn,
      });
      byPlayer.set(entry.playerId, list);
    }
  }

  const rows: StandingsRow[] = (players ?? []).map((player) => {
    const nights = chronological(byPlayer.get(player.id) ?? []);
    const totalGames = nights.length;
    const totalBuyIn = nights.reduce((sum, n) => sum + n.buyIn, 0);
    const totalCashOut = nights.reduce((sum, n) => sum + n.cashOut, 0);
    const balance = totalCashOut - totalBuyIn;
    const profits = nights.map((n) => n.profit);
    const wins = profits.filter((p) => p > 0).length;
    const recent = profits.slice(-RECENT_FORM_WINDOW);

    return {
      rank: 0,
      playerId: player.id,
      playerName: player.name,
      nickname: player.nickname ?? null,
      isActive: player.isActive,
      totalGames,
      totalBuyIn: round2(totalBuyIn),
      totalCashOut: round2(totalCashOut),
      balance: round2(balance),
      avgProfit: totalGames > 0 ? round2(balance / totalGames) : 0,
      winRate: totalGames > 0 ? round2((wins / totalGames) * 100) : 0,
      roi: totalBuyIn > 0 ? round2((balance / totalBuyIn) * 100) : 0,
      bestSession: profits.length > 0 ? round2(Math.max(...profits)) : 0,
      worstSession: profits.length > 0 ? round2(Math.min(...profits)) : 0,
      recentFormWinRate:
        recent.length > 0
          ? round2((recent.filter((p) => p > 0).length / recent.length) * 100)
          : 0,
      currentStreak: streakOf(profits),
      nights: nights.map(({ sessionId, date, profit }) => ({
        sessionId,
        date,
        profit: round2(profit),
      })),
      qualified: totalGames > 0 && totalGames >= minGames,
    };
  });

  const comparator = compareBy(sort, dir);
  const ranked = rows.filter((r) => r.qualified).sort(comparator);
  ranked.forEach((row, index) => {
    row.rank = index + 1;
  });

  return {
    rows: ranked,
    unranked: rows.filter((r) => !r.qualified && r.totalGames > 0).sort(compareBy('balance', 'desc')),
    absent: rows.filter((r) => r.totalGames === 0).sort(compareBy('name', 'asc')),
    sessionCount: counted.length,
    minGames,
    sort: descriptor,
    direction: dir,
  };
}

/**
 * The shape `lib/export.ts` writes. Export keeps every demoted metric — ROI and
 * win rate leave the primary surface, not the data (design §3).
 */
export const toLeaderboardEntries = (rows: StandingsRow[]): LeaderboardEntry[] =>
  rows.map((row) => ({
    rank: row.rank,
    playerId: row.playerId,
    playerName: row.playerName,
    totalGames: row.totalGames,
    totalBuyIn: row.totalBuyIn,
    totalCashOut: row.totalCashOut,
    balance: row.balance,
    roi: row.roi,
    winRate: row.winRate,
    avgProfit: row.avgProfit,
    bestSession: row.bestSession,
    recentFormWinRate: row.recentFormWinRate,
    currentStreak: row.currentStreak,
    isActive: row.isActive,
  }));

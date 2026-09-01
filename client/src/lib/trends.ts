import { parseLocalDate } from './dateUtils';
import type { SplitBucket, SplitSummary } from '@/types';

/**
 * The Trends tab's arithmetic.
 *
 * Everything the charts plot is derived here, as pure functions over already
 * fetched rows, so the shapes are unit-testable without a DOM, a query client
 * or Recharts. The components below `components/analytics/` do layout and
 * colour and nothing else.
 *
 * Three defects the old Analytics page shipped are fixed by construction:
 *   - it never filtered `status`, so a live night (`cashOut = 0` for everyone
 *     still at the table) plotted the whole table as a total loss (D-006);
 *   - it seeded `biggestWin` at 0, so an all-losses range read "+$0.00";
 *   - it keyed participation by player *name*, merging two people called Dan.
 */

/* ------------------------------------------------------------------ *
 * Input shapes — structurally compatible with `@/types` Session, but
 * narrowed to what is actually read, so the tests can build fixtures.
 * ------------------------------------------------------------------ */

export interface TrendEntry {
  playerId: string;
  buyIn: number;
  cashOut: number;
  player?: { id?: string; name: string; nickname?: string | null } | null;
}

export interface TrendSession {
  id?: string;
  date: string;
  createdAt?: string;
  location?: string | null;
  status?: string;
  deletedAt?: string | null;
  entries?: TrendEntry[];
}

/* ------------------------------------------------------------------ *
 * Filtering
 * ------------------------------------------------------------------ */

/**
 * A night counts once it is over. `status` is `@default("COMPLETED")` in the
 * schema, so an absent value is a completed night, not an unknown one.
 */
export const completedSessions = <T extends TrendSession>(
  sessions: readonly T[] | undefined | null
): T[] =>
  (sessions ?? []).filter(
    (session) => !session.deletedAt && (session.status ?? 'COMPLETED') === 'COMPLETED'
  );

export type TrendRange = '30d' | '90d' | '1y' | 'all';

export const TREND_RANGES: ReadonlyArray<{ value: TrendRange; label: string; short: string }> = [
  { value: '30d', label: 'Last 30 days', short: '30d' },
  { value: '90d', label: 'Last 90 days', short: '90d' },
  { value: '1y', label: 'Last year', short: '1y' },
  { value: 'all', label: 'All time', short: 'All' },
];

const RANGE_DAYS: Record<Exclude<TrendRange, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

/** Copies rather than filters in place — `sessions` is the TanStack Query cache. */
export const withinRange = <T extends TrendSession>(
  sessions: readonly T[],
  range: TrendRange,
  now: Date = new Date()
): T[] => {
  if (range === 'all') return [...sessions];
  const cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
  return sessions.filter((session) => parseLocalDate(session.date).getTime() >= cutoff.getTime());
};

const byDate = (a: TrendSession, b: TrendSession): number => {
  const diff = parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
  if (diff !== 0) return diff;
  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return aCreated - bCreated;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

/* ------------------------------------------------------------------ *
 * The page's headline figures
 * ------------------------------------------------------------------ */

export interface TrendHighlight {
  amount: number;
  playerName: string;
  date: string;
}

export interface TrendSummary {
  nights: number;
  /** Distinct player *ids*. Two people called Dan are two people. */
  players: number;
  moneyOnTable: number;
  avgPot: number;
  /** Null when nobody in the range finished a night up — not a zero. */
  biggestWin: TrendHighlight | null;
  biggestLoss: TrendHighlight | null;
}

export const summariseTrends = (sessions: readonly TrendSession[]): TrendSummary => {
  const ids = new Set<string>();
  let moneyOnTable = 0;
  let biggestWin: TrendHighlight | null = null;
  let biggestLoss: TrendHighlight | null = null;

  for (const session of sessions) {
    for (const entry of session.entries ?? []) {
      ids.add(entry.playerId);
      moneyOnTable += entry.buyIn;

      const amount = entry.cashOut - entry.buyIn;
      const highlight: TrendHighlight = {
        amount: round2(amount),
        playerName: entry.player?.name ?? 'Unknown',
        date: session.date,
      };
      if (amount > 0 && (!biggestWin || amount > biggestWin.amount)) biggestWin = highlight;
      if (amount < 0 && (!biggestLoss || amount < biggestLoss.amount)) biggestLoss = highlight;
    }
  }

  return {
    nights: sessions.length,
    players: ids.size,
    moneyOnTable: round2(moneyOnTable),
    avgPot: sessions.length > 0 ? round2(moneyOnTable / sessions.length) : 0,
    biggestWin,
    biggestLoss,
  };
};

/* ------------------------------------------------------------------ *
 * The Swing — one night, reduced to its two extremes
 * ------------------------------------------------------------------ */

export interface NightSwing {
  id: string;
  date: string;
  players: number;
  pot: number;
  location: string | null;
  /** The night's best result, >= 0. */
  topWin: number;
  topWinName: string | null;
  /** The night's worst result, <= 0. Plotted below the zero line. */
  topLoss: number;
  topLossName: string | null;
}

export interface NightSwingOptions {
  /** Keep only the most recent N nights. */
  limit?: number;
}

/**
 * The top and bottom of each night.
 *
 * Deliberately *not* the sum of the table: poker is zero-sum, so a per-night
 * total plots a flat line at $0 plus data-entry drift — a chart doing exactly
 * that was deleted in 2026-07. The spread between the winner and the biggest
 * loser is the real quantity, and it is the one people argue about.
 */
export const buildNightSwings = (
  sessions: readonly TrendSession[],
  { limit }: NightSwingOptions = {}
): NightSwing[] => {
  const swings = [...sessions]
    .sort(byDate)
    .map((session, index): NightSwing | null => {
      const entries = session.entries ?? [];
      if (entries.length === 0) return null;

      let topWin = 0;
      let topWinName: string | null = null;
      let topLoss = 0;
      let topLossName: string | null = null;
      let pot = 0;

      for (const entry of entries) {
        pot += entry.buyIn;
        const profit = entry.cashOut - entry.buyIn;
        if (profit > topWin) {
          topWin = profit;
          topWinName = entry.player?.name ?? null;
        }
        if (profit < topLoss) {
          topLoss = profit;
          topLossName = entry.player?.name ?? null;
        }
      }

      return {
        id: session.id ?? `${session.date}-${index}`,
        date: session.date,
        players: entries.length,
        pot: round2(pot),
        location: session.location?.trim() || null,
        topWin: round2(topWin),
        topWinName,
        topLoss: round2(topLoss),
        topLossName,
      };
    })
    .filter((swing): swing is NightSwing => swing !== null);

  return limit !== undefined && swings.length > limit ? swings.slice(-limit) : swings;
};

/* ------------------------------------------------------------------ *
 * The splits matrix — players against a dimension
 * ------------------------------------------------------------------ */

/** Week order, so Wednesday sits between Tuesday and Thursday rather than wherever its average puts it. */
const WEEK_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export interface OrderSplitOptions {
  /** Column cap. Ten venues is a grid nobody reads. */
  max?: number;
}

/**
 * Buckets in the order a reader expects, not the order the server ranked them.
 * The server sorts every dimension by average profit, which is right for
 * picking a best/worst but wrong for an axis: a week has an order, and so does
 * a table size.
 */
export const orderSplitBuckets = (
  split: SplitSummary,
  { max = 8 }: OrderSplitOptions = {}
): SplitBucket[] => {
  const buckets = [...split.buckets];

  if (split.dimension === 'dayOfWeek') {
    buckets.sort((a, b) => WEEK_ORDER.indexOf(a.key) - WEEK_ORDER.indexOf(b.key));
    return buckets;
  }

  if (split.dimension === 'tableSize') {
    buckets.sort((a, b) => Number(a.key) - Number(b.key));
    return buckets;
  }

  // Venue: busiest first, so the cap drops the one-off rooms rather than the
  // alphabetically unlucky ones.
  buckets.sort((a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label));
  return buckets.slice(0, max);
};

export interface SplitMatrixColumn {
  key: string;
  label: string;
  /** Player-nights in this bucket, across the whole group. */
  sessions: number;
  /** Average buy-in per player-night. Not zero-sum, unlike profit. */
  avgBuyIn: number;
}

export interface SplitMatrixCell {
  value: number;
  sessions: number;
  /** Cleared the server's minimum sample. Below it the number is noise. */
  enough: boolean;
  /** |value| ÷ the grid's largest magnitude, for the fill weight. */
  intensity: number;
}

export interface SplitMatrixRow {
  id: string;
  label: string;
  /** Career balance, for ordering and for the row header. */
  balance: number;
  cells: (SplitMatrixCell | null)[];
}

export interface SplitMatrix {
  columns: SplitMatrixColumn[];
  rows: SplitMatrixRow[];
  /** The largest cell magnitude, which the fills are scaled against. */
  max: number;
  minSessions: number;
  hiddenPlayers: number;
}

/** Only the fields the matrix reads, so `PlayerAngles` satisfies it structurally. */
export interface SplitMatrixPlayer {
  playerId: string;
  playerName: string;
  balance: number;
  splits: Partial<Record<SplitSummary['dimension'], SplitSummary>>;
}

export interface SplitMatrixOptions extends OrderSplitOptions {
  maxRows?: number;
}

/**
 * Per-player profit inside each bucket.
 *
 * Group-level profit per bucket is *summed across every player*, which in a
 * zero-sum game is $0 plus drift — the server's own `venue.totalProfit` for
 * this group reads +$5 / +$10 / −$10 across three venues, which says nothing.
 * Split it by player and the same data says Lucho is +$163 on Sundays while
 * Muel is −$70 on the same nights. The group split is still what orders and
 * labels the columns; the numbers in the grid are per-player.
 */
export const buildSplitMatrix = (
  groupSplit: SplitSummary,
  players: readonly SplitMatrixPlayer[],
  { max, maxRows = 9 }: SplitMatrixOptions = {}
): SplitMatrix => {
  const ordered = orderSplitBuckets(groupSplit, max === undefined ? undefined : { max });
  const columns: SplitMatrixColumn[] = ordered.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    sessions: bucket.sessions,
    avgBuyIn: bucket.avgBuyIn,
  }));

  const ranked = [...players].sort(
    (a, b) => b.balance - a.balance || a.playerName.localeCompare(b.playerName)
  );
  const visible = ranked.slice(0, maxRows);

  const lookup = (player: SplitMatrixPlayer): Map<string, SplitBucket> => {
    const split = player.splits[groupSplit.dimension];
    return new Map((split?.buckets ?? []).map((bucket) => [bucket.key, bucket]));
  };

  const raw = visible.map((player) => {
    const buckets = lookup(player);
    return {
      player,
      cells: columns.map((column) => buckets.get(column.key) ?? null),
    };
  });

  const max_ = raw.reduce(
    (biggest, row) =>
      row.cells.reduce(
        (inner, cell) => (cell ? Math.max(inner, Math.abs(cell.totalProfit)) : inner),
        biggest
      ),
    0
  );

  const rows: SplitMatrixRow[] = raw.map(({ player, cells }) => ({
    id: player.playerId,
    label: player.playerName,
    balance: player.balance,
    cells: cells.map((bucket) =>
      bucket
        ? {
            value: bucket.totalProfit,
            sessions: bucket.sessions,
            enough: bucket.sessions >= groupSplit.minSessions,
            intensity: max_ > 0 ? Math.abs(bucket.totalProfit) / max_ : 0,
          }
        : null
    ),
  }));

  return {
    columns,
    rows,
    max: max_,
    minSessions: groupSplit.minSessions,
    hiddenPlayers: Math.max(0, ranked.length - visible.length),
  };
};

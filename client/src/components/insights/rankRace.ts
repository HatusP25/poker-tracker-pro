import type { Session } from '@/types';

/**
 * The Race for #1 — leaderboard position after every night.
 *
 * Pulled out of the chart component for two reasons. It was the page's only
 * client-side computation over raw sessions, and it counted **in-progress**
 * nights: a live table stores `cashOut = 0` for everyone still sitting, so the
 * moment a night started the whole field appeared to lose their buy-in and the
 * race jumped. The server-side endpoints already exclude those (D-006); this is
 * the client's copy of the same rule.
 *
 * It also has a second job now: the chart's headline. "Lucho has held #1 for
 * fourteen nights" is the sentence the picture is making, and a chart that can
 * say its own conclusion earns its place on a story page.
 */

/** `date` is the raw ISO string; the chart formats it. Other keys are `playerId -> rank`. */
export interface RankRaceRow {
  date: string;
  [playerId: string]: string | number | undefined;
}

export interface RankRacePlayer {
  id: string;
  name: string;
  /** 1 = leading the group right now. */
  finalRank: number;
}

export interface RankRaceLeader {
  playerId: string;
  playerName: string;
  /** Consecutive nights, counting back from the latest, finishing first. */
  nights: number;
}

export interface RankRace {
  rows: RankRaceRow[];
  /** Final standing order — the order a legend should read in. */
  players: RankRacePlayer[];
  leader: RankRaceLeader | null;
  nights: number;
}

const EMPTY: RankRace = { rows: [], players: [], leader: null, nights: 0 };

/**
 * D-006: a night counts once it is `COMPLETED`. Sessions predating the status
 * column, and any fixture that omits it, are treated as finished — the field is
 * optional in the client's `Session` type, and defaulting the other way would
 * blank the chart rather than protect it.
 */
const isCompleted = (session: Session): boolean =>
  (session.status ?? 'COMPLETED') === 'COMPLETED';

export function buildRankRace(sessions: readonly Session[]): RankRace {
  const ordered = sessions
    .filter((s) => isCompleted(s) && (s.entries?.length ?? 0) > 0)
    // A copy: `sessions` is the TanStack Query cache array and sorting it in
    // place would mutate every other consumer's data.
    .slice()
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id)
    );

  if (ordered.length === 0) return EMPTY;

  const cumulative = new Map<string, number>();
  const names = new Map<string, string>();
  const rows: RankRaceRow[] = [];

  for (const session of ordered) {
    for (const entry of session.entries ?? []) {
      names.set(entry.playerId, entry.player?.name ?? entry.playerId);
      cumulative.set(
        entry.playerId,
        (cumulative.get(entry.playerId) ?? 0) + (entry.cashOut - entry.buyIn)
      );
    }

    const row: RankRaceRow = { date: session.date };
    standingOrder(cumulative, names).forEach((playerId, index) => {
      row[playerId] = index + 1;
    });
    rows.push(row);
  }

  const finalOrder = standingOrder(cumulative, names);
  const players: RankRacePlayer[] = finalOrder.map((id, index) => ({
    id,
    name: names.get(id) ?? id,
    finalRank: index + 1,
  }));

  return { rows, players, leader: leadStreak(rows, names), nights: rows.length };
}

/** Most profit first; ties resolved by name, so the same history draws the same chart. */
function standingOrder(
  cumulative: ReadonlyMap<string, number>,
  names: ReadonlyMap<string, string>
): string[] {
  return [...cumulative.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1] || (names.get(a[0]) ?? a[0]).localeCompare(names.get(b[0]) ?? b[0])
    )
    .map(([playerId]) => playerId);
}

/** How long the current leader has been the leader. */
function leadStreak(
  rows: readonly RankRaceRow[],
  names: ReadonlyMap<string, string>
): RankRaceLeader | null {
  const leaderOf = (row: RankRaceRow): string | null =>
    Object.keys(row).find((key) => key !== 'date' && row[key] === 1) ?? null;

  const current = rows.length > 0 ? leaderOf(rows[rows.length - 1]) : null;
  if (!current) return null;

  let nights = 0;
  for (let i = rows.length - 1; i >= 0 && leaderOf(rows[i]) === current; i--) {
    nights++;
  }

  return { playerId: current, playerName: names.get(current) ?? current, nights };
}

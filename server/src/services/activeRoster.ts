import { prisma } from '../lib/prisma';

/**
 * The shape `filterRowsToActive` needs. Deliberately minimal so every row type in
 * play — insightsService's `SessionRow`, banterService's `BanterSessionRow`,
 * sessionSummaryRules' `SummarySessionRow` and anglesRules' `AngleSessionRow` —
 * satisfies it without changing.
 */
export interface NightTotals {
  /**
   * What the night actually was, captured before deactivation narrowed the
   * entries: the real pot, and the real number of seats filled.
   *
   * D-B says these describe *the night*, not the roster — but narrowing the
   * entry list destroys both, so a five-handed $100 game silently became a
   * three-handed $60 one the moment two of its players left the group. Rules
   * that report a night-level total read these in preference to the entries.
   *
   * Only set on a row the filter actually narrowed. Where it did not, the
   * entries are already whole and summing them is exact.
   */
  nightPot?: number;
  nightPlayerCount?: number;
}

export interface ActiveFilterableRow extends NightTotals {
  entries: { playerId: string; buyIn: number }[];
  rebuyEvents?: { playerId: string }[];
}

export interface FilterOptions {
  /**
   * Drop sessions the filter empties out. Default true.
   *
   * True for the belt and the records/recap surfaces: `computeBeltLineage`
   * increments `nightsHeld` before checking whether anyone played, so an empty
   * night would hand the current champion a free reign defence.
   *
   * False for the angles engine, where `ordered.length` is the denominator for
   * every attendance rate. A night only departed players attended still happened,
   * and per D-B night counts stay whole — so it must survive as an empty row.
   */
  dropEmpty?: boolean;
}

/**
 * Remove every trace of non-active players from already-fetched session rows.
 *
 * This is the single point where deactivation is applied. Services call it
 * between fetching and computing, which keeps every `compute*` rule function
 * unaware that deactivation exists.
 *
 * Strips entries for players outside `activeIds`, and strips those players'
 * rebuyEvents *in lockstep* — otherwise achievements and the "most rebuys"
 * record count rebuys with no matching entry.
 */
export function filterRowsToActive<T extends ActiveFilterableRow>(
  rows: T[],
  activeIds: ReadonlySet<string>,
  { dropEmpty = true }: FilterOptions = {}
): T[] {
  const out: T[] = [];

  for (const row of rows) {
    const entries = row.entries.filter((e) => activeIds.has(e.playerId));
    if (entries.length === 0 && dropEmpty) continue;

    // Only remember the night's real totals when we are about to lose them. A
    // row that survives whole needs nothing; one narrowed twice keeps whatever
    // the first pass recorded, which is the original.
    const narrowed = entries.length !== row.entries.length;

    // Spread-over-generic needs the assertion; the shape is unchanged, only the
    // two arrays are narrowed.
    out.push({
      ...row,
      entries,
      ...(narrowed && {
        nightPot: row.nightPot ?? row.entries.reduce((sum, e) => sum + e.buyIn, 0),
        nightPlayerCount: row.nightPlayerCount ?? row.entries.length,
      }),
      ...(row.rebuyEvents !== undefined && {
        rebuyEvents: row.rebuyEvents.filter((r) => activeIds.has(r.playerId)),
      }),
    } as T);
  }

  return out;
}

/** The group's active roster, as an id set ready for `filterRowsToActive`. */
export async function fetchActivePlayerIds(groupId: string): Promise<Set<string>> {
  const players = await prisma.player.findMany({
    where: { groupId, isActive: true },
    select: { id: true },
  });
  return new Set(players.map((p) => p.id));
}

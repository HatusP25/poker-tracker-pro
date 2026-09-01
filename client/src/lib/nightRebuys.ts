/**
 * How many rebuys each player had on a night.
 *
 * `RebuyEvent` rows are the single source of truth for rebuy counts — the server
 * settled this in F-07 (`server/src/utils/rebuys.ts`) and retired the old
 * fractional buy-in arithmetic from every production path. The client never got
 * the memo: `SessionDetail` computed `buyIn > 5 ? (buyIn - 5) / 5 : 0`, which
 *
 *   - hardcoded a $5 buy-in and ignored `group.defaultBuyIn` entirely,
 *   - ignored every recorded rebuy, so a single $30 rebuy on a $35 buy-in read
 *     as six, and
 *   - printed fractions: "1.4x rebuys".
 *
 * This is the client's copy of the server's rule, in the same order of
 * preference:
 *
 *   1. the count the server already resolved and shipped on the entry,
 *   2. the rebuy rows actually recorded for that player,
 *   3. a reconstruction from the buy-in against the *group's* default,
 *   4. zero — never a guess against a default we do not have.
 *
 * Pure, so it is testable without a DB or a browser.
 */

/** Mirrors `round` in server/src/utils/calculations.ts. */
const round = (value: number, decimals = 2): number =>
  Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);

/** Ceiling on a reconstruction, matching the server's MAX_DERIVED_REBUYS. */
export const MAX_DERIVED_REBUYS = 100;

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * The rebuys a total buy-in implies, when nothing was recorded.
 *
 * The excess over one standard buy-in splits into full-size rebuys plus a
 * remainder, so $17 at a $5 default is three trips to the bank — [5, 5, 2] —
 * exactly as `deriveRebuyAmounts` reconstructs it server-side. Always an
 * integer: a person cannot make 1.4 rebuys.
 */
export function deriveRebuyCount(
  buyIn: number,
  defaultBuyIn: number | null | undefined
): number {
  if (!Number.isFinite(buyIn) || buyIn < 0) return 0;
  if (!isCount(defaultBuyIn) || defaultBuyIn <= 0) return 0;

  const excess = round(buyIn - defaultBuyIn);
  if (excess <= 0) return 0;

  // The 6-decimal round keeps 0.30 / 0.10 from landing on 2.9999999996.
  const full = Math.floor(round(excess / defaultBuyIn, 6));
  if (full >= MAX_DERIVED_REBUYS) return MAX_DERIVED_REBUYS;

  const remainder = round(excess - defaultBuyIn * full);
  return full + (remainder > 0 ? 1 : 0);
}

export interface ResolveRebuyInput {
  buyIn: number;
  /** `SessionEntry.rebuys` as sent by GET /sessions/:id, where present. */
  serverCount?: number | null;
  /** Recorded `RebuyEvent` rows for this player. */
  recorded?: number;
  defaultBuyIn?: number | null;
}

/** One player's rebuy count, by the order of preference documented above. */
export function resolveRebuyCount({
  buyIn,
  serverCount,
  recorded = 0,
  defaultBuyIn,
}: ResolveRebuyInput): number {
  if (isCount(serverCount)) return Math.round(serverCount);
  if (recorded > 0) return Math.round(recorded);
  return deriveRebuyCount(buyIn, defaultBuyIn);
}

export interface RebuyEntryLike {
  playerId: string;
  buyIn: number;
  /** Resolved server-side; absent on payloads that don't compute it. */
  rebuys?: number | null;
}

export interface RebuyEventLike {
  playerId: string;
  /** Unused here — counting rows is the rule — but real payloads carry it. */
  amount?: number;
}

export interface RebuyCountsInput {
  entries: RebuyEntryLike[];
  /** Recorded rows for the night. Missing rows are reconstructed per player. */
  rebuyEvents?: RebuyEventLike[];
  /** `group.defaultBuyIn`. Without it, nothing is reconstructed. */
  defaultBuyIn?: number | null;
}

/**
 * `playerId -> rebuy count` for a whole night.
 *
 * The gap is filled per player rather than per session, so a night where only
 * one player's rebuys were captured live still reconstructs everyone else's.
 */
export function rebuyCountsByPlayer({
  entries,
  rebuyEvents = [],
  defaultBuyIn,
}: RebuyCountsInput): Map<string, number> {
  const recorded = new Map<string, number>();
  for (const event of rebuyEvents) {
    recorded.set(event.playerId, (recorded.get(event.playerId) ?? 0) + 1);
  }

  return new Map(
    entries.map((entry) => [
      entry.playerId,
      resolveRebuyCount({
        buyIn: entry.buyIn,
        serverCount: entry.rebuys,
        recorded: recorded.get(entry.playerId) ?? 0,
        defaultBuyIn,
      }),
    ])
  );
}

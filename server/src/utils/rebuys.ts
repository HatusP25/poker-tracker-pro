import { round } from './calculations';

/**
 * Reconstruct the rebuys implied by a hand-entered total buy-in.
 *
 * `RebuyEvent` rows are the single source of truth for rebuy counts, but only the
 * live path ever recorded them — a session typed in after the fact had none, so
 * every rebuy-based award (ATM, Houdini, Phoenix, Rebuy Royalty, most-rebuys,
 * biggest-comeback) silently skipped it. This derives the missing rows from the
 * one thing the stored data does tell us: the total.
 *
 * The excess over one standard buy-in is split into full-size rebuys plus a
 * remainder, so $17 at a $5 default becomes [5, 5, 2]. The amounts always sum to
 * `buyIn - defaultBuyIn`, so a reconstruction can never disagree with the recorded
 * total.
 *
 * This inherits the assumption the old `calculateRebuys` already made — that a
 * player's first buy-in was the group default — which is the only thing the stored
 * data supports. Derived rows are flagged `derived: true` so they are always
 * distinguishable from, and never confused with, an observed live rebuy.
 */

/** Ceiling on generated rows, so a fat-fingered buy-in can't produce unbounded inserts. */
const MAX_DERIVED_REBUYS = 100;

export function deriveRebuyAmounts(buyIn: number, defaultBuyIn: number): number[] {
  if (!Number.isFinite(buyIn) || !Number.isFinite(defaultBuyIn)) return [];
  if (defaultBuyIn <= 0 || buyIn < 0) return [];

  const excess = round(buyIn - defaultBuyIn);
  if (excess <= 0) return [];

  const fullRebuys = Math.floor(round(excess / defaultBuyIn, 6));

  // Past the cap, collapse the tail into the final rebuy rather than truncating —
  // the amounts must still add up to the recorded total.
  if (fullRebuys >= MAX_DERIVED_REBUYS) {
    const head = Array<number>(MAX_DERIVED_REBUYS - 1).fill(defaultBuyIn);
    return [...head, round(excess - defaultBuyIn * (MAX_DERIVED_REBUYS - 1))];
  }

  const amounts = Array<number>(fullRebuys).fill(defaultBuyIn);
  const remainder = round(excess - defaultBuyIn * fullRebuys);
  if (remainder > 0) amounts.push(remainder);

  return amounts;
}

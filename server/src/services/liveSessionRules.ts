import { isValidCashOut } from '../utils/validators';

/**
 * Rules for cashing a player out of a live session before the night ends.
 *
 * Pure functions over already-fetched rows (the insightsService convention), so
 * every rejection branch is unit-testable without a database. `liveSessionService`
 * fetches, calls these, and only then writes.
 */

export interface CashOutEntryRow {
  playerId: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
  /** Null means "still at the table" — which is what every pre-2026-07-30 row means. */
  cashedOutAt: Date | null;
}

export type RulePlan = { ok: true } | { ok: false; reason: string };

export const isCashedOut = (entry: CashOutEntryRow): boolean => entry.cashedOutAt !== null;

/** The rows End Session still needs numbers for. */
export const entriesAwaitingCashOut = (entries: CashOutEntryRow[]): CashOutEntryRow[] =>
  entries.filter((e) => !isCashedOut(e));

export function planEarlyCashOut(
  entries: CashOutEntryRow[],
  playerId: string,
  cashOut: number
): RulePlan {
  const entry = entries.find((e) => e.playerId === playerId);
  if (!entry) {
    return { ok: false, reason: 'Player is not in this session' };
  }

  if (isCashedOut(entry)) {
    return { ok: false, reason: `${entry.playerName} has already cashed out` };
  }

  // A cash-out of 0 is legitimate and common — that's busting out.
  if (!isValidCashOut(cashOut)) {
    return { ok: false, reason: `Invalid cash-out amount for ${entry.playerName}` };
  }

  // Cashing out the last player standing isn't an early exit, it's the end of the
  // night — and only End Session computes settlements and the zero-sum check.
  const stillPlaying = entriesAwaitingCashOut(entries);
  if (stillPlaying.length <= 1) {
    return {
      ok: false,
      reason:
        `${entry.playerName} is the last player at the table — end the session ` +
        'instead, so the night is settled properly.',
    };
  }

  return { ok: true };
}

export function planUndoCashOut(entries: CashOutEntryRow[], playerId: string): RulePlan {
  const entry = entries.find((e) => e.playerId === playerId);
  if (!entry) {
    return { ok: false, reason: 'Player is not in this session' };
  }

  if (!isCashedOut(entry)) {
    return { ok: false, reason: `${entry.playerName} has not cashed out` };
  }

  return { ok: true };
}

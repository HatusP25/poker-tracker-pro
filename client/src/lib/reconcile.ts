/**
 * End-of-night reconciliation.
 *
 * Chip counts never match to the cent. The server requires cash-outs to sum exactly
 * to buy-ins and rejects anything else — correctly, and that stays authoritative.
 * These helpers just let the user resolve the difference deliberately (split it, or
 * pin it on whoever miscounted) instead of nudging an arbitrary number until the
 * app relents.
 *
 * All arithmetic runs in integer cents, so the adjusted set sums *exactly* to the
 * buy-in total rather than to within float dust.
 */

export interface CashOutRow {
  playerId: string;
  playerName: string;
  cashOut: number;
}

export type ReconcileResult =
  | { ok: true; cashOuts: Record<string, number> }
  | { ok: false; reason: string };

const toCents = (amount: number): number => Math.round(amount * 100);
const toDollars = (cents: number): number => cents / 100;

/**
 * Signed difference between what's on the table and what went in.
 * Positive = more cash-out than buy-in (chips appeared); negative = short.
 */
export function computeDiscrepancy(totalBuyIn: number, rows: CashOutRow[]): number {
  const cashOutCents = rows.reduce((sum, r) => sum + toCents(r.cashOut), 0);
  return toDollars(cashOutCents - toCents(totalBuyIn));
}

/** Build the result map, refusing if any adjustment drove someone below zero. */
function finalize(centsById: Map<string, number>): ReconcileResult {
  const cashOuts: Record<string, number> = {};

  for (const [playerId, cents] of centsById) {
    if (cents < 0) {
      return {
        ok: false,
        reason:
          'That would push a cash-out below zero. Pick a different split, or ' +
          'keep editing the amounts.',
      };
    }
    cashOuts[playerId] = toDollars(cents);
  }

  return { ok: true, cashOuts };
}

/**
 * Spread the difference evenly across `targetIds`, giving the indivisible remainder
 * out one cent at a time so nothing is lost to rounding.
 */
export function splitEvenly(
  rows: CashOutRow[],
  totalBuyIn: number,
  targetIds: string[]
): ReconcileResult {
  const centsById = new Map(rows.map((r) => [r.playerId, toCents(r.cashOut)]));

  // A target that isn't at the table can't absorb anything.
  const targets = targetIds.filter((id) => centsById.has(id));
  if (targets.length === 0) {
    return { ok: false, reason: 'There is nobody to split the difference across.' };
  }

  const currentCents = [...centsById.values()].reduce((s, c) => s + c, 0);
  const deltaCents = toCents(totalBuyIn) - currentCents; // what must be added overall

  if (deltaCents === 0) {
    return finalize(centsById);
  }

  // Integer division toward zero, then hand out the leftover cents one by one so
  // the parts always add back up to the whole.
  const share = Math.trunc(deltaCents / targets.length);
  let remainder = deltaCents - share * targets.length;
  const step = remainder > 0 ? 1 : -1;

  for (const id of targets) {
    let adjustment = share;
    if (remainder !== 0) {
      adjustment += step;
      remainder -= step;
    }
    centsById.set(id, centsById.get(id)! + adjustment);
  }

  return finalize(centsById);
}

/** Put the entire difference on one player — whoever miscounted. */
export function assignToOne(
  rows: CashOutRow[],
  totalBuyIn: number,
  playerId: string
): ReconcileResult {
  const centsById = new Map(rows.map((r) => [r.playerId, toCents(r.cashOut)]));

  if (!centsById.has(playerId)) {
    return { ok: false, reason: 'That player is not at the table.' };
  }

  const currentCents = [...centsById.values()].reduce((s, c) => s + c, 0);
  const deltaCents = toCents(totalBuyIn) - currentCents;

  centsById.set(playerId, centsById.get(playerId)! + deltaCents);

  return finalize(centsById);
}

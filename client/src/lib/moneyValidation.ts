/**
 * Client-side money-input rules. Single source of truth, mirroring the server's
 * validators (server/src/utils/validators.ts) so the UI and API never disagree.
 *
 * The server is the ultimate backstop; these helpers exist to stop nonsensical
 * input at the point of entry and explain why a value is invalid.
 */

export const MAX_BUY_IN = 1000;
export const MAX_CASH_OUT = 10000;

export interface FieldValidity {
  valid: boolean;
  message?: string;
}

const VALID: FieldValidity = { valid: true };

/** Buy-in must be greater than $0 and at most MAX_BUY_IN. */
export function validateBuyIn(value: number): FieldValidity {
  if (!Number.isFinite(value)) return { valid: false, message: 'Enter a buy-in amount' };
  if (value <= 0) return { valid: false, message: 'Buy-in must be greater than $0' };
  if (value > MAX_BUY_IN) return { valid: false, message: `Max buy-in is $${MAX_BUY_IN}` };
  return VALID;
}

/** Cash-out must be at least $0 (0 = lost everything) and at most MAX_CASH_OUT. */
export function validateCashOut(value: number): FieldValidity {
  if (!Number.isFinite(value)) return { valid: false, message: 'Enter a cash-out amount' };
  if (value < 0) return { valid: false, message: "Cash-out can't be negative (min $0)" };
  if (value > MAX_CASH_OUT) return { valid: false, message: `Max cash-out is $${MAX_CASH_OUT}` };
  return VALID;
}

/** A rebuy follows the same rule as a buy-in: greater than $0, at most MAX_BUY_IN. */
export function validateRebuy(value: number): FieldValidity {
  if (!Number.isFinite(value)) return { valid: false, message: 'Enter a rebuy amount' };
  if (value <= 0) return { valid: false, message: 'Rebuy must be greater than $0' };
  if (value > MAX_BUY_IN) return { valid: false, message: `Max rebuy is $${MAX_BUY_IN}` };
  return VALID;
}

/** Clamp a cash-out into its valid range: negatives -> 0, over-cap -> MAX_CASH_OUT. */
export function clampCashOut(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > MAX_CASH_OUT) return MAX_CASH_OUT;
  return value;
}

/**
 * Settlement Service
 *
 * Calculates optimal payment structure to settle poker session debts
 * Uses greedy algorithm to minimize number of transactions
 */

import { ValidationError } from '../utils/validators';

interface PlayerBalance {
  playerId: string;
  playerName: string;
  balance: number; // Positive = owed money, Negative = owes money
}

export interface Settlement {
  from: string; // Player name who pays
  to: string; // Player name who receives
  amount: number; // Amount to transfer
  paid?: boolean; // Per-session paid/pending status; absent/false = unpaid. Display state only, never affects the money math above.
}

/**
 * Calculate settlements using greedy algorithm
 * Minimizes the number of transactions needed to settle all debts
 *
 * Note: works entirely on cloned balances so the caller's input is never mutated.
 */
export function calculateSettlements(balances: PlayerBalance[]): Settlement[] {
  // Create working copies to avoid mutating input — both sides must be cloned
  // because the loop below decrements their `balance` fields.
  const debtors = balances
    .filter(b => b.balance < 0)
    .map(b => ({ ...b, balance: Math.abs(b.balance) }))
    .sort((a, b) => b.balance - a.balance); // Largest debts first

  const creditors = balances
    .filter(b => b.balance > 0)
    .map(b => ({ ...b }))
    .sort((a, b) => b.balance - a.balance); // Largest credits first

  const settlements: Settlement[] = [];
  let i = 0; // Debtor index
  let j = 0; // Creditor index

  // Greedy matching: pair largest debtor with largest creditor
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Settle as much as possible between this pair
    const amount = Math.min(debtor.balance, creditor.balance);

    settlements.push({
      from: debtor.playerName,
      to: creditor.playerName,
      amount: round(amount, 2),
    });

    // Reduce balances
    debtor.balance -= amount;
    creditor.balance -= amount;

    // Move to next debtor/creditor if current one is settled.
    // Use an epsilon rather than exact equality to absorb floating-point dust.
    if (debtor.balance < 0.005) i++;
    if (creditor.balance < 0.005) j++;
  }

  return settlements;
}

/**
 * Validate that a settlement set actually reconciles a set of balances.
 *
 * For each player, (money received - money paid) must equal their balance. A
 * correct, zero-sum settlement set drives every player's net to their original
 * balance. Returns false if any player is off by more than a cent.
 */
export function validateSettlements(
  balances: PlayerBalance[],
  settlements: Settlement[]
): boolean {
  const net = new Map<string, number>();
  for (const b of balances) {
    net.set(b.playerName, 0);
  }

  for (const s of settlements) {
    if (!net.has(s.from) || !net.has(s.to)) {
      return false; // settlement references a player not in the balances
    }
    if (s.amount <= 0) {
      return false; // transfers must be positive
    }
    net.set(s.from, net.get(s.from)! - s.amount);
    net.set(s.to, net.get(s.to)! + s.amount);
  }

  for (const b of balances) {
    if (Math.abs(net.get(b.playerName)! - b.balance) > 0.01) {
      return false;
    }
  }

  return true;
}

/**
 * Validate that all balances sum to zero (fundamental poker rule)
 */
export function validateZeroSum(balances: PlayerBalance[]): boolean {
  const total = balances.reduce((sum, b) => sum + b.balance, 0);
  return Math.abs(total) < 0.01; // Allow for floating-point errors
}

/**
 * Round to specified decimal places
 */
function round(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calculate settlements from session entries.
 *
 * Throws a ValidationError (HTTP 400) when the table does not reconcile to zero,
 * surfacing the exact discrepancy so the user can correct a cash-out. This is a
 * routine end-of-night condition (chip counts rarely match to the cent), not an
 * internal server error.
 */
export function calculateSessionSettlements(
  entries: Array<{
    playerId: string;
    playerName: string;
    buyIn: number;
    cashOut: number;
  }>
): Settlement[] {
  // Calculate net balance for each player
  const balances: PlayerBalance[] = entries.map(entry => ({
    playerId: entry.playerId,
    playerName: entry.playerName,
    balance: entry.cashOut - entry.buyIn,
  }));

  // Validate zero-sum before calculating settlements
  if (!validateZeroSum(balances)) {
    const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = entries.reduce((sum, e) => sum + e.cashOut, 0);
    const discrepancy = round(totalCashOut - totalBuyIn, 2);
    const sign = discrepancy > 0 ? 'over' : 'short';
    throw new ValidationError(
      `Cash-outs don't reconcile: total buy-in is ${round(totalBuyIn, 2)} but ` +
        `total cash-out is ${round(totalCashOut, 2)} (${Math.abs(discrepancy)} ${sign}). ` +
        `Adjust a cash-out so they match before settling.`
    );
  }

  const settlements = calculateSettlements(balances);

  // Post-condition: the computed settlements must reconcile the balances.
  // This guards against any regression in the greedy algorithm itself.
  if (!validateSettlements(balances, settlements)) {
    throw new Error('Internal error: computed settlements do not reconcile balances');
  }

  return settlements;
}

/**
 * Flip the `paid` flag on a single settlement transfer within a session's
 * serialized settlements JSON, returning the updated JSON string.
 *
 * Pure function: does not touch the database or know about sessions — the
 * caller (sessionService) is responsible for confirming the session exists
 * and is COMPLETED before calling this. Never alters `from`/`to`/`amount`;
 * `paid` is display-only state layered on top of the money math.
 */
export function setSettlementPaid(
  settlementsJson: string | null | undefined,
  index: number,
  paid: boolean
): string {
  if (typeof paid !== 'boolean') {
    throw new ValidationError('paid must be a boolean');
  }

  if (!Number.isInteger(index)) {
    throw new ValidationError('Settlement index must be an integer');
  }

  if (!settlementsJson) {
    throw new ValidationError('Session has no settlements to update');
  }

  let settlements: Settlement[];
  try {
    settlements = JSON.parse(settlementsJson);
  } catch {
    throw new ValidationError('Session settlements are corrupted and could not be parsed');
  }

  if (!Array.isArray(settlements) || index < 0 || index >= settlements.length) {
    throw new ValidationError(
      `Settlement index ${index} is out of range (session has ${Array.isArray(settlements) ? settlements.length : 0} settlements)`
    );
  }

  const updated = settlements.map((s, i) => (i === index ? { ...s, paid } : s));
  return JSON.stringify(updated);
}

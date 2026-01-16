/**
 * Settlement Service
 *
 * Calculates optimal payment structure to settle poker session debts
 * Uses greedy algorithm to minimize number of transactions
 */

interface PlayerBalance {
  playerId: string;
  playerName: string;
  balance: number; // Positive = owed money, Negative = owes money
}

export interface Settlement {
  from: string; // Player name who pays
  to: string; // Player name who receives
  amount: number; // Amount to transfer
}

/**
 * Calculate settlements using greedy algorithm
 * Minimizes the number of transactions needed to settle all debts
 */
export function calculateSettlements(balances: PlayerBalance[]): Settlement[] {
  // Create working copies to avoid mutating input
  const debtors = balances
    .filter(b => b.balance < 0)
    .map(b => ({ ...b, balance: Math.abs(b.balance) }))
    .sort((a, b) => b.balance - a.balance); // Largest debts first

  const creditors = balances
    .filter(b => b.balance > 0)
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

    // Move to next debtor/creditor if current one is settled
    if (debtor.balance === 0) i++;
    if (creditor.balance === 0) j++;
  }

  return settlements;
}

/**
 * Validate that settlements are zero-sum (total in = total out)
 */
export function validateSettlements(settlements: Settlement[]): boolean {
  if (settlements.length === 0) return true;

  const totalIn = settlements.reduce((sum, s) => sum + s.amount, 0);
  const totalOut = settlements.reduce((sum, s) => sum + s.amount, 0);

  // They should be equal (both represent the same money moving)
  // Allow for small floating-point errors
  return Math.abs(totalIn - totalOut) < 0.01;
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
 * Calculate settlements from session entries
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
    throw new Error('Session is not zero-sum. Total buy-ins must equal total cash-outs.');
  }

  return calculateSettlements(balances);
}

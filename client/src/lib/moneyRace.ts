import { parseLocalDate } from './dateUtils';

export interface MoneyRaceEntryInput {
  playerId: string;
  buyIn: number;
  cashOut: number;
  player?: { name?: string | null } | null;
}

export interface MoneyRaceSessionInput {
  date: string;
  createdAt?: string;
  entries?: MoneyRaceEntryInput[];
}

export interface MoneyRacePlayer {
  id: string;
  name: string;
}

export interface MoneyRaceRow {
  date: string;
  [playerId: string]: number | string;
}

export interface MoneyRaceResult {
  rows: MoneyRaceRow[];
  players: MoneyRacePlayer[];
}

/**
 * Builds cumulative-profit-per-player rows over time, suitable for a
 * multi-line Recharts LineChart ("The Money Race"). Each player's line
 * carries their last cumulative value forward through sessions they skip
 * (via a persistent running total), and a player who first appears mid-range
 * starts accumulating from a 0 baseline rather than backfilling history.
 */
export const computeMoneyRace = (sessions: MoneyRaceSessionInput[]): MoneyRaceResult => {
  const ordered = [...sessions].sort((a, b) => {
    const dateDiff = parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aCreated - bCreated;
  });

  const cumulative = new Map<string, number>();
  const names = new Map<string, string>();
  const rows: MoneyRaceRow[] = [];

  for (const session of ordered) {
    for (const entry of session.entries ?? []) {
      if (!cumulative.has(entry.playerId)) {
        cumulative.set(entry.playerId, 0);
      }
      names.set(entry.playerId, entry.player?.name ?? entry.playerId);
      cumulative.set(entry.playerId, cumulative.get(entry.playerId)! + (entry.cashOut - entry.buyIn));
    }

    const row: MoneyRaceRow = { date: session.date };
    for (const [playerId, value] of cumulative.entries()) {
      row[playerId] = value;
    }
    rows.push(row);
  }

  const players: MoneyRacePlayer[] = [...names.entries()].map(([id, name]) => ({ id, name }));

  return { rows, players };
};

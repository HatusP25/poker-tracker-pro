import { prisma } from '../lib/prisma';
import {
  calculateProfit,
  calculateStreak,
  calculateLongestWinStreak,
  calculateLongestLossStreak,
  round,
} from '../utils/calculations';
import {
  GroupRecords,
  RecordEntry,
  StreakRecord,
  HeadToHeadResponse,
  PairStats,
  PlayerRivalryInsight,
  PlayerForm,
  SeasonRecap,
  SeasonSuperlative,
} from '../types/insights';

// ---- Tunable constants ----
export const RECENT_WINDOW = 5;
export const STREAK_BADGE_THRESHOLD = 3;
export const COMEBACK_MIN_REBUYS = 2;
export const ROI_MIN_BUYIN = 1;

// ---- In-memory row shapes (already fetched, DB-agnostic for unit tests) ----
export interface EntryRow {
  playerId: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
  rebuyCount: number;
}

export interface SessionRow {
  id: string;
  date: string; // ISO string
  entries: EntryRow[];
}

// ---- Module 1: Records (pure) ----
export function computeRecords(sessions: SessionRow[]): GroupRecords {
  const empty: GroupRecords = {
    biggestWin: null,
    biggestLoss: null,
    biggestComeback: null,
    longestWinStreak: null,
    longestLossStreak: null,
    mostRebuys: null,
    bestRoiNight: null,
    biggestPot: null,
  };
  if (sessions.length === 0) return empty;

  // Sort sessions oldest -> newest so ties resolve to the earliest occurrence.
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let biggestWin: RecordEntry | null = null;
  let biggestLoss: RecordEntry | null = null;
  let biggestComeback: RecordEntry | null = null;
  let mostRebuys: RecordEntry | null = null;
  let bestRoiNight: RecordEntry | null = null;
  let biggestPot: GroupRecords['biggestPot'] = null;

  for (const s of ordered) {
    const pot = s.entries.reduce((sum, e) => sum + e.buyIn, 0);
    if (!biggestPot || pot > biggestPot.total) {
      biggestPot = { sessionId: s.id, date: s.date, total: round(pot) };
    }

    for (const e of s.entries) {
      const profit = calculateProfit(e.cashOut, e.buyIn);
      const entry: RecordEntry = {
        playerId: e.playerId,
        playerName: e.playerName,
        sessionId: s.id,
        date: s.date,
        value: round(profit),
      };

      if (!biggestWin || profit > biggestWin.value) biggestWin = { ...entry };
      if (!biggestLoss || profit < biggestLoss.value) biggestLoss = { ...entry };

      if (
        e.rebuyCount >= COMEBACK_MIN_REBUYS &&
        profit > 0 &&
        (!biggestComeback || profit > biggestComeback.value)
      ) {
        biggestComeback = { ...entry };
      }

      if (!mostRebuys || e.rebuyCount > mostRebuys.value) {
        mostRebuys = { ...entry, value: e.rebuyCount };
      }

      if (e.buyIn >= ROI_MIN_BUYIN) {
        const roi = (profit / e.buyIn) * 100;
        if (!bestRoiNight || roi > bestRoiNight.value) {
          bestRoiNight = { ...entry, value: round(roi) };
        }
      }
    }
  }

  return {
    biggestWin,
    biggestLoss,
    biggestComeback,
    longestWinStreak: computeStreakRecord(ordered, 'win'),
    longestLossStreak: computeStreakRecord(ordered, 'loss'),
    mostRebuys,
    bestRoiNight,
    biggestPot,
  };
}

function computeStreakRecord(
  ordered: SessionRow[],
  type: 'win' | 'loss'
): StreakRecord | null {
  // Build per-player result series in chronological order.
  const series = new Map<string, { name: string; results: { profit: number; date: Date }[] }>();
  for (const s of ordered) {
    for (const e of s.entries) {
      if (!series.has(e.playerId)) series.set(e.playerId, { name: e.playerName, results: [] });
      series.get(e.playerId)!.results.push({
        profit: calculateProfit(e.cashOut, e.buyIn),
        date: new Date(s.date),
      });
    }
  }

  let best: StreakRecord | null = null;
  for (const [playerId, { name, results }] of series) {
    const count =
      type === 'win'
        ? calculateLongestWinStreak(results)
        : calculateLongestLossStreak(results);
    if (count > 0 && (!best || count > best.count)) {
      best = { playerId, playerName: name, count };
    }
  }
  return best;
}

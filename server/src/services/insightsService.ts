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

// ---- Module 2: Head-to-Head (pure) ----
interface ProfitByPlayer {
  [playerId: string]: { name: string; profit: number };
}

function sessionProfits(s: SessionRow): ProfitByPlayer {
  const out: ProfitByPlayer = {};
  for (const e of s.entries) {
    out[e.playerId] = { name: e.playerName, profit: calculateProfit(e.cashOut, e.buyIn) };
  }
  return out;
}

function pairStats(
  ordered: SessionRow[],
  aId: string,
  bId: string
): PairStats | null {
  let aName = '';
  let bName = '';
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let differential = 0;
  // results in chronological order: 'a' | 'b' | 'tie'
  const series: ('a' | 'b' | 'tie')[] = [];

  for (const s of ordered) {
    const p = sessionProfits(s);
    if (!p[aId] || !p[bId]) continue;
    aName = p[aId].name;
    bName = p[bId].name;
    differential += p[aId].profit - p[bId].profit;
    if (p[aId].profit > p[bId].profit) {
      aWins++;
      series.push('a');
    } else if (p[bId].profit > p[aId].profit) {
      bWins++;
      series.push('b');
    } else {
      ties++;
      series.push('tie');
    }
  }

  const shared = aWins + bWins + ties;
  if (shared === 0) return null;

  // Current streak: walk backwards while the same player keeps finishing higher.
  let streakHolder: string | null = null;
  let streakCount = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    const r = series[i];
    if (r === 'tie') break;
    const holder = r === 'a' ? aName : bName;
    if (streakHolder === null) {
      streakHolder = holder;
      streakCount = 1;
    } else if (streakHolder === holder) {
      streakCount++;
    } else {
      break;
    }
  }

  return {
    playerAId: aId,
    playerAName: aName,
    playerBId: bId,
    playerBName: bName,
    sharedSessions: shared,
    aWins,
    bWins,
    ties,
    profitDifferential: round(differential),
    currentStreakHolder: streakHolder,
    currentStreakCount: streakCount,
  };
}

export function computeHeadToHead(
  sessions: SessionRow[],
  playerA?: string,
  playerB?: string
): HeadToHeadResponse {
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Collect all player ids/names seen.
  const names = new Map<string, string>();
  for (const s of ordered) for (const e of s.entries) names.set(e.playerId, e.playerName);
  const ids = [...names.keys()];

  // Requested pair.
  const pair = playerA && playerB ? pairStats(ordered, playerA, playerB) : null;

  // All pairs -> biggest rivalry + per-player tallies.
  let biggestRivalry: PairStats | null = null;
  const winsOver = new Map<string, Map<string, number>>(); // playerId -> oppId -> wins
  const lossesTo = new Map<string, Map<string, number>>(); // playerId -> oppId -> losses
  const ensure = (m: Map<string, Map<string, number>>, k: string) => {
    if (!m.has(k)) m.set(k, new Map());
    return m.get(k)!;
  };

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const ps = pairStats(ordered, ids[i], ids[j]);
      if (!ps) continue;
      if (!biggestRivalry || ps.sharedSessions > biggestRivalry.sharedSessions) {
        biggestRivalry = ps;
      }
      const a = ids[i];
      const b = ids[j];
      ensure(winsOver, a).set(b, ps.aWins);
      ensure(lossesTo, a).set(b, ps.bWins);
      ensure(winsOver, b).set(a, ps.bWins);
      ensure(lossesTo, b).set(a, ps.aWins);
    }
  }

  const playerInsights: PlayerRivalryInsight[] = ids.map((id) => {
    let favoriteVictim: PlayerRivalryInsight['favoriteVictim'] = null;
    let bogey: PlayerRivalryInsight['bogey'] = null;
    for (const [oppId, wins] of winsOver.get(id) ?? []) {
      if (wins > 0 && (!favoriteVictim || wins > favoriteVictim.winsOver)) {
        favoriteVictim = { playerId: oppId, playerName: names.get(oppId)!, winsOver: wins };
      }
    }
    for (const [oppId, losses] of lossesTo.get(id) ?? []) {
      if (losses > 0 && (!bogey || losses > bogey.lossesTo)) {
        bogey = { playerId: oppId, playerName: names.get(oppId)!, lossesTo: losses };
      }
    }
    return { playerId: id, playerName: names.get(id)!, bogey, favoriteVictim };
  });

  return { pair, biggestRivalry, playerInsights };
}

// ---- Module 3: Form & Momentum (pure) ----
// playerNames maps id -> name so requested players with zero games still appear.
export function computeForm(
  sessions: SessionRow[],
  activePlayerIds: string[],
  playerNames?: Map<string, string>
): PlayerForm[] {
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const names = playerNames ?? new Map<string, string>();
  const seriesByPlayer = new Map<string, { profit: number; date: Date }[]>();
  for (const id of activePlayerIds) seriesByPlayer.set(id, []);

  for (const s of ordered) {
    for (const e of s.entries) {
      if (!names.has(e.playerId)) names.set(e.playerId, e.playerName);
      if (!seriesByPlayer.has(e.playerId)) continue; // not in requested set
      seriesByPlayer.get(e.playerId)!.push({
        profit: calculateProfit(e.cashOut, e.buyIn),
        date: new Date(s.date),
      });
    }
  }

  return activePlayerIds.map((id) => {
    const series = seriesByPlayer.get(id) ?? [];
    const recent = series.slice(-RECENT_WINDOW);
    const recentResults = recent.map((r) => r.profit);
    const recentWins = recentResults.filter((p) => p > 0).length;
    const streak = calculateStreak(series);

    // Trajectory: compare average of the second half vs the first half of the window.
    let trajectory: 'up' | 'down' | 'flat' = 'flat';
    if (recentResults.length >= 2) {
      const mid = Math.floor(recentResults.length / 2);
      const firstHalf = recentResults.slice(0, mid);
      const secondHalf = recentResults.slice(recentResults.length - mid);
      const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
      const diff = avg(secondHalf) - avg(firstHalf);
      if (diff > 0) trajectory = 'up';
      else if (diff < 0) trajectory = 'down';
    }

    let badge: 'heater' | 'slump' | null = null;
    if (streak.type === 'win' && streak.count >= STREAK_BADGE_THRESHOLD) badge = 'heater';
    else if (streak.type === 'loss' && streak.count >= STREAK_BADGE_THRESHOLD) badge = 'slump';

    return {
      playerId: id,
      playerName: names.get(id) ?? '',
      recentResults,
      recentWins,
      recentGames: recentResults.length,
      trajectory,
      currentStreak: streak.count,
      streakType: streak.type,
      badge,
    };
  });
}

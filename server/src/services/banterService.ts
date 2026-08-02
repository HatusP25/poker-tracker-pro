import { prisma } from '../lib/prisma';
import { calculateProfit, round } from '../utils/calculations';
import {
  NightTitle,
  NightTitleId,
  BeltReign,
  BeltLineage,
  AchievementId,
  EarnedAchievement,
  PlayerAchievements,
  AchievementsResponse,
} from '../types/banter';
import { withDerivedRebuyEvents } from '../utils/rebuys';

// ---- In-memory row shapes (already fetched, DB-agnostic for unit tests) ----
// Matches what insightsService fetches: Session { id, date, createdAt, status,
// deletedAt, entries: [{ playerId, buyIn, cashOut, player: { name } }], rebuyEvents: [{ playerId, amount }] }.
export interface BanterEntryRow {
  playerId: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
}

export interface BanterRebuyRow {
  playerId: string;
  amount: number;
}

export interface BanterSessionRow {
  id: string;
  date: string; // ISO string
  createdAt: string; // ISO string
  status: string;
  deletedAt: string | null;
  entries: BanterEntryRow[];
  rebuyEvents: BanterRebuyRow[];
}

// ---- Shared helper: per-player night rows (profit + rebuy stats) ----
interface PlayerNightRow {
  playerId: string;
  playerName: string;
  profit: number;
  rebuyCount: number;
  rebuyTotal: number;
}

function buildPlayerNightRows(
  entries: BanterEntryRow[],
  rebuys: BanterRebuyRow[]
): PlayerNightRow[] {
  const counts = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const r of rebuys) {
    counts.set(r.playerId, (counts.get(r.playerId) ?? 0) + 1);
    totals.set(r.playerId, (totals.get(r.playerId) ?? 0) + r.amount);
  }
  return entries.map((e) => ({
    playerId: e.playerId,
    playerName: e.playerName,
    profit: round(calculateProfit(e.cashOut, e.buyIn)),
    rebuyCount: counts.get(e.playerId) ?? 0,
    rebuyTotal: totals.get(e.playerId) ?? 0,
  }));
}

function pickBest<T>(rows: T[], compare: (a: T, b: T) => number): T {
  return [...rows].sort(compare)[0];
}

// ---- Module 1: Night Titles (pure) ----
export function computeNightTitles(
  entries: BanterEntryRow[],
  rebuys: BanterRebuyRow[]
): NightTitle[] {
  const rows = buildPlayerNightRows(entries, rebuys);
  const titles: NightTitle[] = [];

  const push = (id: NightTitleId, label: string, emoji: string, row: PlayerNightRow) => {
    titles.push({ id, label, emoji, playerId: row.playerId, playerName: row.playerName });
  };

  // Shark of the Night: max profit, only if > 0. Tie-break: fewest rebuys -> name asc.
  const sharkCandidates = rows.filter((r) => r.profit > 0);
  if (sharkCandidates.length) {
    const winner = pickBest(
      sharkCandidates,
      (a, b) => b.profit - a.profit || a.rebuyCount - b.rebuyCount || a.playerName.localeCompare(b.playerName)
    );
    push('shark', 'Shark of the Night', '🦈', winner);
  }

  // Donation of the Night: min profit, only if < 0. Tie-break: most rebuys -> name asc.
  const donationCandidates = rows.filter((r) => r.profit < 0);
  if (donationCandidates.length) {
    const winner = pickBest(
      donationCandidates,
      (a, b) => a.profit - b.profit || b.rebuyCount - a.rebuyCount || a.playerName.localeCompare(b.playerName)
    );
    push('donation', 'Donation of the Night', '💸', winner);
  }

  // ATM: most rebuys, min 2. Tie-break: highest rebuy $ total -> name asc.
  const atmCandidates = rows.filter((r) => r.rebuyCount >= 2);
  if (atmCandidates.length) {
    const winner = pickBest(
      atmCandidates,
      (a, b) =>
        b.rebuyCount - a.rebuyCount ||
        b.rebuyTotal - a.rebuyTotal ||
        a.playerName.localeCompare(b.playerName)
    );
    push('atm', 'ATM', '🏧', winner);
  }

  // Houdini: profit > 0 with >= 2 rebuys (highest such profit). Tie-break: fewest rebuys -> name asc.
  const houdiniCandidates = rows.filter((r) => r.profit > 0 && r.rebuyCount >= 2);
  if (houdiniCandidates.length) {
    const winner = pickBest(
      houdiniCandidates,
      (a, b) => b.profit - a.profit || a.rebuyCount - b.rebuyCount || a.playerName.localeCompare(b.playerName)
    );
    push('houdini', 'Houdini', '🎩', winner);
  }

  return titles;
}

// ---- Module 2: The Belt (pure) ----
function beltCompare(a: PlayerNightRow, b: PlayerNightRow): number {
  return b.profit - a.profit || a.rebuyCount - b.rebuyCount || a.playerName.localeCompare(b.playerName);
}

interface ReignAcc {
  playerId: string;
  playerName: string;
  fromDate: string;
  nightsHeld: number;
  defenses: number;
  takenFromPlayerName: string | null;
}

export function computeBeltLineage(sessions: BanterSessionRow[]): BeltLineage {
  const ordered = sessions
    .filter((s) => s.status === 'COMPLETED' && !s.deletedAt)
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  let current: ReignAcc | null = null;
  const history: BeltReign[] = [];

  for (const s of ordered) {
    const rows = buildPlayerNightRows(s.entries, s.rebuyEvents);

    if (!current) {
      if (rows.length === 0) continue;
      const champion = pickBest(rows, beltCompare);
      current = {
        playerId: champion.playerId,
        playerName: champion.playerName,
        fromDate: s.date,
        nightsHeld: 1,
        defenses: 0,
        takenFromPlayerName: null,
      };
      continue;
    }

    current.nightsHeld += 1;

    const holderRow = rows.find((r) => r.playerId === current!.playerId);
    if (!holderRow) continue; // belt not at stake when the holder is absent

    const challengers = rows.filter((r) => r.playerId !== current!.playerId && r.profit > holderRow.profit);
    if (challengers.length === 0) {
      current.defenses += 1;
      continue;
    }

    const winner = pickBest(challengers, beltCompare);
    history.push({
      playerId: current.playerId,
      playerName: current.playerName,
      fromDate: current.fromDate,
      toDate: s.date,
      nightsHeld: current.nightsHeld,
      defenses: current.defenses,
      takenFromPlayerName: current.takenFromPlayerName,
    });
    current = {
      playerId: winner.playerId,
      playerName: winner.playerName,
      fromDate: s.date,
      nightsHeld: 1,
      defenses: 0,
      takenFromPlayerName: current.playerName,
    };
  }

  return {
    current: current
      ? {
          playerId: current.playerId,
          playerName: current.playerName,
          fromDate: current.fromDate,
          toDate: null,
          nightsHeld: current.nightsHeld,
          defenses: current.defenses,
          takenFromPlayerName: current.takenFromPlayerName,
        }
      : null,
    history,
    totalTitleChanges: history.length,
  };
}

// ---- Module 3: Achievements (pure) ----
const ACHIEVEMENT_CATALOG: { id: AchievementId; name: string; emoji: string; description: string }[] = [
  { id: 'hat-trick', name: 'Hat Trick', emoji: '🎩', description: '3 consecutive wins' },
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    emoji: '🃏',
    description: 'A win immediately after 3 or more consecutive losses',
  },
  { id: 'phoenix', name: 'Phoenix', emoji: '🔥', description: 'A positive night with 3 or more rebuys' },
  {
    id: 'giant-slayer',
    name: 'Giant Slayer',
    emoji: '⚔️',
    description: 'Out-profit the all-time balance leader in a night you played',
  },
  { id: 'iron-man', name: 'Iron Man', emoji: '🛡️', description: 'Attended 10 consecutive group sessions' },
  { id: 'regular', name: 'Regular', emoji: '📅', description: '25 sessions played' },
  { id: 'veteran', name: 'Veteran', emoji: '🏛️', description: '50 sessions played' },
  { id: 'rebuy-royalty', name: 'Rebuy Royalty', emoji: '👑', description: '25 career rebuys' },
  {
    id: 'double-up',
    name: 'Double-Up',
    emoji: '💰',
    description: "Night profit at least 2x that night's total buy-in",
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    emoji: '🎯',
    description: 'Current holder of the biggest single-night profit in group history',
  },
];

interface PlayerAchievementState {
  playerName: string;
  games: number;
  careerRebuys: number;
  winStreak: number;
  lossStreak: number;
  cumulativeBalance: number;
  ironManStreak: number;
  earned: Map<AchievementId, EarnedAchievement>;
}

export function computeAchievements(sessions: BanterSessionRow[]): AchievementsResponse {
  const ordered = sessions
    .filter((s) => s.status === 'COMPLETED' && !s.deletedAt)
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  const players = new Map<string, PlayerAchievementState>();
  const allSeen = new Set<string>();
  let untouchable: { profit: number; playerId: string; playerName: string; sessionId: string; date: string } | null =
    null;

  const getState = (playerId: string, playerName: string): PlayerAchievementState => {
    let st = players.get(playerId);
    if (!st) {
      st = {
        playerName,
        games: 0,
        careerRebuys: 0,
        winStreak: 0,
        lossStreak: 0,
        cumulativeBalance: 0,
        ironManStreak: 0,
        earned: new Map(),
      };
      players.set(playerId, st);
    }
    return st;
  };

  const award = (st: PlayerAchievementState, id: AchievementId, ctx: { id: string; date: string }) => {
    if (st.earned.has(id)) return;
    const meta = ACHIEVEMENT_CATALOG.find((c) => c.id === id)!;
    st.earned.set(id, {
      id,
      name: meta.name,
      emoji: meta.emoji,
      description: meta.description,
      earnedAt: ctx.date,
      sessionId: ctx.id,
    });
  };

  for (const s of ordered) {
    const rows = buildPlayerNightRows(s.entries, s.rebuyEvents);
    const totalBuyIn = s.entries.reduce((sum, e) => sum + e.buyIn, 0);
    const nameByPlayerId = new Map(rows.map((r) => [r.playerId, r.playerName]));

    // All-time balance leader entering this session, based only on prior sessions.
    let leader: { playerId: string; balance: number } | null = null;
    for (const [id, st] of players) {
      if (leader === null || st.cumulativeBalance > leader.balance) {
        leader = { playerId: id, balance: st.cumulativeBalance };
      }
    }

    // Iron Man bookkeeping: every player ever seen either extends or resets their
    // consecutive-group-session attendance streak this session.
    const attendingIds = new Set(rows.map((r) => r.playerId));
    for (const id of attendingIds) allSeen.add(id);
    for (const id of allSeen) {
      const st = players.get(id) ?? getState(id, nameByPlayerId.get(id) ?? '');
      st.ironManStreak = attendingIds.has(id) ? st.ironManStreak + 1 : 0;
    }

    for (const row of rows) {
      const st = getState(row.playerId, row.playerName);
      st.games += 1;

      // Giant Slayer
      if (leader && leader.playerId !== row.playerId && row.profit > leader.balance) {
        award(st, 'giant-slayer', s);
      }

      // Hat Trick / Comeback Kid via win/loss streaks (break-even resets both, counts as neither)
      if (row.profit > 0) {
        if (st.lossStreak >= 3) award(st, 'comeback-kid', s);
        st.winStreak += 1;
        st.lossStreak = 0;
        if (st.winStreak >= 3) award(st, 'hat-trick', s);
      } else if (row.profit < 0) {
        st.lossStreak += 1;
        st.winStreak = 0;
      } else {
        st.winStreak = 0;
        st.lossStreak = 0;
      }

      // Phoenix
      if (row.profit > 0 && row.rebuyCount >= 3) award(st, 'phoenix', s);

      // Double-Up
      if (totalBuyIn > 0 && row.profit >= 2 * totalBuyIn) award(st, 'double-up', s);

      // Rebuy Royalty
      st.careerRebuys += row.rebuyCount;
      if (st.careerRebuys >= 25) award(st, 'rebuy-royalty', s);

      // Regular / Veteran
      if (st.games >= 25) award(st, 'regular', s);
      if (st.games >= 50) award(st, 'veteran', s);

      // Iron Man
      if (st.ironManStreak >= 10) award(st, 'iron-man', s);

      // Untouchable record tracking (transferable; resolved after the full pass)
      if (!untouchable || row.profit > untouchable.profit) {
        untouchable = {
          profit: row.profit,
          playerId: row.playerId,
          playerName: row.playerName,
          sessionId: s.id,
          date: s.date,
        };
      }

      st.cumulativeBalance += row.profit;
    }
  }

  if (untouchable) {
    const st = players.get(untouchable.playerId)!;
    award(st, 'untouchable', { id: untouchable.sessionId, date: untouchable.date });
  }

  const playersOut: PlayerAchievements[] = [...players.entries()].map(([playerId, st]) => ({
    playerId,
    playerName: st.playerName,
    earned: [...st.earned.values()],
  }));

  const recentUnlocks = playersOut
    .flatMap((p) => p.earned.map((e) => ({ ...e, playerId: p.playerId, playerName: p.playerName })))
    .sort(
      (a, b) =>
        new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime() ||
        a.playerName.localeCompare(b.playerName)
    )
    .slice(0, 10);

  return { players: playersOut, recentUnlocks, catalog: ACHIEVEMENT_CATALOG };
}

// ---- Data access ----
async function fetchBanterSessionRows(groupId: string): Promise<BanterSessionRow[]> {
  const sessions = await prisma.session.findMany({
    where: { groupId, deletedAt: null },
    include: {
      entries: { include: { player: true } },
      rebuyEvents: true,
      group: { select: { defaultBuyIn: true } },
    },
    orderBy: { date: 'asc' },
  });

  return sessions.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    createdAt: s.createdAt.toISOString(),
    status: s.status,
    deletedAt: s.deletedAt ? s.deletedAt.toISOString() : null,
    entries: s.entries.map((e) => ({
      playerId: e.playerId,
      playerName: e.player.name,
      buyIn: e.buyIn,
      cashOut: e.cashOut,
    })),
    // Nights that never recorded rebuy events get them reconstructed from each
    // buy-in, so ATM / Houdini / Phoenix / Rebuy Royalty reach hand-entered
    // sessions instead of silently skipping them.
    rebuyEvents: withDerivedRebuyEvents(s.entries, s.rebuyEvents, s.group.defaultBuyIn),
  }));
}

export class BanterService {
  async getBelt(groupId: string): Promise<BeltLineage> {
    const rows = await fetchBanterSessionRows(groupId);
    return computeBeltLineage(rows);
  }

  async getAchievements(groupId: string): Promise<AchievementsResponse> {
    const rows = await fetchBanterSessionRows(groupId);
    return computeAchievements(rows);
  }
}

export const banterService = new BanterService();

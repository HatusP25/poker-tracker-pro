# Insights: The Story of Your Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new top-level **Insights** area (`/insights`) with four read-only modules — Hall of Fame & Records, Rivalries/Head-to-Head, Form & Momentum, Season Recap — plus a shared "nicer graphs" layer, all derived from existing data with no schema changes.

**Architecture:** New read-only computations live as methods on the existing `StatsService` (`server/src/services/statsService.ts`), exposed via four new `/stats` endpoints. The frontend adds a new `/insights` route, nav item, `G+I` shortcut, TanStack Query hooks, and module components under `client/src/components/insights/`, with a shared chart theme. Everything excludes soft-deleted sessions (`deletedAt: null`), matching existing service behavior. Nothing touches money/settlement logic.

**Tech Stack:** Backend — Express + Prisma + Vitest (`vitest run`). Frontend — React 18 + TypeScript + TanStack Query + Recharts + shadcn/ui + Tailwind. E2E — Playwright.

**Spec:** `docs/superpowers/specs/2026-06-18-insights-home-game-story-design.md`

---

## File Structure

**Backend (create):**
- `server/src/services/insightsService.ts` — all four computations (records, head-to-head, form, season). Kept separate from `statsService.ts` because that file is already ~620 lines; this is a focused, testable unit.
- `server/src/services/insightsService.test.ts` — unit tests with in-memory fixtures.
- `server/src/types/insights.ts` — shared response types for the four modules.

**Backend (modify):**
- `server/src/types/index.ts` — re-export insights types.
- `server/src/controllers/statsController.ts` — 4 new controller functions.
- `server/src/routes/stats.ts` — 4 new routes.
- `server/tests/integration/api.test.ts` — integration coverage for the 4 endpoints.

**Frontend (create):**
- `client/src/components/insights/charts/chartTheme.ts` — shared colors/gradients/formatters.
- `client/src/components/insights/charts/Sparkline.tsx` — momentum sparkline.
- `client/src/components/insights/charts/RankRaceChart.tsx` — rank-over-time bump chart.
- `client/src/components/insights/RecordsModule.tsx`
- `client/src/components/insights/RivalriesModule.tsx`
- `client/src/components/insights/FormBoardModule.tsx`
- `client/src/components/insights/SeasonRecapModule.tsx`
- `client/src/pages/Insights.tsx`

**Frontend (modify):**
- `client/src/lib/api.ts` — `insightsApi` group.
- `client/src/hooks/useInsights.ts` (create) — query hooks.
- `client/src/types/index.ts` — frontend insights types (mirror backend).
- `client/src/App.tsx` — `/insights` route.
- `client/src/components/layout/NavBar.tsx` — Insights nav item.
- `client/src/hooks/useKeyboardShortcuts.ts` — `G+I`.
- `client/src/components/CommandPalette.tsx` — Insights command.

**E2E (create):**
- `e2e/insights.spec.ts`

---

## Computation Constants (used across tasks)

These exact values are referenced by multiple tasks — keep them consistent:

- `RECENT_WINDOW = 5` — number of most-recent sessions used for form/momentum.
- `STREAK_BADGE_THRESHOLD = 3` — current streak length to earn a heater/slump badge.
- `COMEBACK_MIN_REBUYS = 2` — minimum rebuys for a positive result to count as a "comeback".
- `ROI_MIN_BUYIN = 1` — minimum buy-in denominator for "best ROI night" (avoids tiny-denominator noise).

Define them as exported `const`s at the top of `insightsService.ts`.

---

## Shared Types (Task 1 establishes these; later tasks depend on them)

All response types. Profit = `cashOut - buyIn` (via existing `calculateProfit`). Rebuys counted from `RebuyEvent` rows. All money/ROI values rounded to 2 decimals via existing `round`.

---

### Task 1: Insights response types

**Files:**
- Create: `server/src/types/insights.ts`
- Modify: `server/src/types/index.ts`

- [ ] **Step 1: Create the types file**

```typescript
// server/src/types/insights.ts

// ---- Module 1: Records ----
export interface RecordEntry {
  playerId: string;
  playerName: string;
  sessionId: string;
  date: string; // ISO string
  value: number; // profit, rebuys, or roi% depending on record
}

export interface StreakRecord {
  playerId: string;
  playerName: string;
  count: number;
}

export interface PotRecord {
  sessionId: string;
  date: string; // ISO string
  total: number;
}

export interface GroupRecords {
  biggestWin: RecordEntry | null;
  biggestLoss: RecordEntry | null;
  biggestComeback: RecordEntry | null;
  longestWinStreak: StreakRecord | null;
  longestLossStreak: StreakRecord | null;
  mostRebuys: RecordEntry | null;
  bestRoiNight: RecordEntry | null;
  biggestPot: PotRecord | null;
}

// ---- Module 2: Head-to-Head ----
export interface PairStats {
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  sharedSessions: number;
  aWins: number; // sessions A finished higher (more profit)
  bWins: number;
  ties: number;
  profitDifferential: number; // sum(A.profit - B.profit), rounded
  currentStreakHolder: string | null; // playerName currently leading the H2H streak
  currentStreakCount: number;
}

export interface PlayerRivalryInsight {
  playerId: string;
  playerName: string;
  bogey: { playerId: string; playerName: string; lossesTo: number } | null;
  favoriteVictim: { playerId: string; playerName: string; winsOver: number } | null;
}

export interface HeadToHeadResponse {
  pair: PairStats | null; // null unless both playerA & playerB requested and share >=1 session
  biggestRivalry: PairStats | null; // most shared sessions across the group
  playerInsights: PlayerRivalryInsight[];
}

// ---- Module 3: Form & Momentum ----
export interface PlayerForm {
  playerId: string;
  playerName: string;
  recentResults: number[]; // last RECENT_WINDOW profits, oldest -> newest
  recentWins: number;
  recentGames: number;
  trajectory: 'up' | 'down' | 'flat';
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
  badge: 'heater' | 'slump' | null;
}

// ---- Module 4: Season Recap ----
export interface SeasonSuperlative {
  playerId: string;
  playerName: string;
  value: number;
}

export interface SeasonRecap {
  period: string; // e.g. "2026"
  totalSessions: number;
  totalPot: number;
  champion: SeasonSuperlative | null; // highest total profit
  attendanceKing: SeasonSuperlative | null; // most sessions played
  biggestMover: { playerId: string; playerName: string; positionsGained: number } | null;
  bestSingleNight: RecordEntry | null;
  mostRebuys: SeasonSuperlative | null;
}
```

- [ ] **Step 2: Re-export from the types barrel**

Add to the end of `server/src/types/index.ts`:

```typescript
export * from './insights';
```

- [ ] **Step 3: Verify it compiles**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/types/insights.ts server/src/types/index.ts
git commit -m "feat(insights): add response types for insights modules"
```

---

### Task 2: Records computation (Module 1)

**Files:**
- Create: `server/src/services/insightsService.ts`
- Test: `server/src/services/insightsService.test.ts`

The service fetches sessions with entries + rebuy events + players for a group, then computes pure functions over them. To keep it unit-testable without a database, **the computation logic is a set of exported pure functions** that take already-fetched rows; the class method just fetches and delegates.

- [ ] **Step 1: Write the failing test**

```typescript
// server/src/services/insightsService.test.ts
import { describe, it, expect } from 'vitest';
import { computeRecords, type SessionRow } from './insightsService';

// Helper to build a session row. defaultBuyIn is the group's standard buy-in.
const makeSession = (
  id: string,
  date: string,
  entries: { playerId: string; playerName: string; buyIn: number; cashOut: number; rebuys: number }[]
): SessionRow => ({
  id,
  date,
  entries: entries.map((e) => ({
    playerId: e.playerId,
    playerName: e.playerName,
    buyIn: e.buyIn,
    cashOut: e.cashOut,
    rebuyCount: e.rebuys,
  })),
});

describe('computeRecords', () => {
  it('returns all-null records for an empty group', () => {
    const records = computeRecords([]);
    expect(records.biggestWin).toBeNull();
    expect(records.biggestPot).toBeNull();
    expect(records.longestWinStreak).toBeNull();
  });

  it('finds the biggest single-night win and loss', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 40, rebuys: 0 }, // +30
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 0, rebuys: 0 }, // -10
      ]),
      makeSession('s2', '2026-01-08T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 30, cashOut: 0, rebuys: 2 }, // -30
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 70, rebuys: 0 }, // +60
      ]),
    ];
    const records = computeRecords(sessions);
    expect(records.biggestWin).toMatchObject({ playerName: 'Bob', value: 60, sessionId: 's2' });
    expect(records.biggestLoss).toMatchObject({ value: -30, sessionId: 's2' });
  });

  it('finds biggest comeback (>=2 rebuys and positive profit)', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 30, cashOut: 80, rebuys: 2 }, // +50, comeback
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 90, rebuys: 0 }, // +80 but no rebuys
      ]),
    ];
    const records = computeRecords(sessions);
    expect(records.biggestComeback).toMatchObject({ playerName: 'Alice', value: 50 });
  });

  it('finds most rebuys and biggest pot', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 40, cashOut: 0, rebuys: 3 },
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 50, rebuys: 0 },
      ]),
    ];
    const records = computeRecords(sessions);
    expect(records.mostRebuys).toMatchObject({ playerName: 'Alice', value: 3 });
    expect(records.biggestPot).toMatchObject({ sessionId: 's1', total: 50 }); // 40 + 10
  });

  it('computes longest win and loss streaks across sessions in date order', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }]),
      makeSession('s2', '2026-01-08T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }]),
      makeSession('s3', '2026-01-15T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 0, rebuys: 0 }]),
    ];
    const records = computeRecords(sessions);
    expect(records.longestWinStreak).toMatchObject({ playerName: 'Alice', count: 2 });
    expect(records.longestLossStreak).toMatchObject({ playerName: 'Alice', count: 1 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd server && npx vitest run src/services/insightsService.test.ts`
Expected: FAIL — `computeRecords` is not exported / module not found.

- [ ] **Step 3: Write minimal implementation**

```typescript
// server/src/services/insightsService.ts
import { prisma } from '../lib/prisma';
import {
  calculateProfit,
  calculateLongestWinStreak,
  calculateLongestLossStreak,
  round,
} from '../utils/calculations';
import {
  GroupRecords,
  RecordEntry,
  StreakRecord,
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && npx vitest run src/services/insightsService.test.ts`
Expected: PASS (all `computeRecords` tests green).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/insightsService.ts server/src/services/insightsService.test.ts
git commit -m "feat(insights): records computation (Module 1)"
```

---

### Task 3: Head-to-Head computation (Module 2)

**Files:**
- Modify: `server/src/services/insightsService.ts`
- Modify: `server/src/services/insightsService.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `insightsService.test.ts`:

```typescript
import { computeHeadToHead } from './insightsService';

describe('computeHeadToHead', () => {
  const sessions = [
    makeSession('s1', '2026-01-01T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 30, rebuys: 0 }, // +20
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 5, rebuys: 0 }, // -5  => A higher
    ]),
    makeSession('s2', '2026-01-08T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 25, rebuys: 0 }, // +15
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 0, rebuys: 0 }, // -10 => A higher
    ]),
    makeSession('s3', '2026-01-15T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 0, rebuys: 0 }, // -10
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 40, rebuys: 0 }, // +30 => B higher
    ]),
  ];

  it('computes pairwise record, differential and current streak', () => {
    const res = computeHeadToHead(sessions, 'a', 'b');
    expect(res.pair).toMatchObject({
      playerAName: 'Alice',
      playerBName: 'Bob',
      sharedSessions: 3,
      aWins: 2,
      bWins: 1,
      ties: 0,
    });
    // differential = (20 - -5) + (15 - -10) + (-10 - 30) = 25 + 25 - 40 = 10
    expect(res.pair!.profitDifferential).toBe(10);
    // Most recent shared session: Bob higher -> Bob currently on a 1-session streak
    expect(res.pair!.currentStreakHolder).toBe('Bob');
    expect(res.pair!.currentStreakCount).toBe(1);
  });

  it('returns null pair when players share no sessions', () => {
    const solo = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }]),
      makeSession('s2', '2026-01-08T00:00:00.000Z', [{ playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 20, rebuys: 0 }]),
    ];
    expect(computeHeadToHead(solo, 'a', 'b').pair).toBeNull();
  });

  it('surfaces the biggest rivalry and per-player bogey/favorite victim', () => {
    const res = computeHeadToHead(sessions);
    expect(res.biggestRivalry).toMatchObject({ sharedSessions: 3 });
    const alice = res.playerInsights.find((p) => p.playerId === 'a')!;
    expect(alice.favoriteVictim).toMatchObject({ playerName: 'Bob', winsOver: 2 });
    expect(alice.bogey).toMatchObject({ playerName: 'Bob', lossesTo: 1 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/services/insightsService.test.ts`
Expected: FAIL — `computeHeadToHead` not exported.

- [ ] **Step 3: Implement**

Append to `insightsService.ts` (add imports for the new types at the top import block):

```typescript
// add to existing import from '../types/insights':
//   HeadToHeadResponse, PairStats, PlayerRivalryInsight

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
      if (
        !biggestRivalry ||
        ps.sharedSessions > biggestRivalry.sharedSessions
      ) {
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
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run src/services/insightsService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/insightsService.ts server/src/services/insightsService.test.ts
git commit -m "feat(insights): head-to-head computation (Module 2)"
```

---

### Task 4: Form & Momentum computation (Module 3)

**Files:**
- Modify: `server/src/services/insightsService.ts`
- Modify: `server/src/services/insightsService.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `insightsService.test.ts`:

```typescript
import { computeForm } from './insightsService';

describe('computeForm', () => {
  it('returns recent results oldest->newest, trajectory and badges', () => {
    // 4 straight wins -> heater badge, up trajectory
    const sessions = ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22'].map((d, i) =>
      makeSession(`s${i}`, `${d}T00:00:00.000Z`, [
        { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }, // +10 each
      ])
    );
    const form = computeForm(sessions, ['a']);
    const alice = form.find((f) => f.playerId === 'a')!;
    expect(alice.recentResults).toEqual([10, 10, 10, 10]);
    expect(alice.recentGames).toBe(4);
    expect(alice.recentWins).toBe(4);
    expect(alice.currentStreak).toBe(4);
    expect(alice.streakType).toBe('win');
    expect(alice.badge).toBe('heater');
  });

  it('only includes the requested active players and handles no games', () => {
    const sessions = [
      makeSession('s1', '2026-01-01T00:00:00.000Z', [{ playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 20, rebuys: 0 }]),
    ];
    const form = computeForm(sessions, ['a', 'z']);
    expect(form.map((f) => f.playerId).sort()).toEqual(['a', 'z']);
    const z = form.find((f) => f.playerId === 'z')!;
    expect(z.recentGames).toBe(0);
    expect(z.badge).toBeNull();
    expect(z.trajectory).toBe('flat');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/services/insightsService.test.ts`
Expected: FAIL — `computeForm` not exported.

- [ ] **Step 3: Implement**

Append to `insightsService.ts` (add `PlayerForm` to the insights-types import):

```typescript
import { calculateStreak } from '../utils/calculations';
// add PlayerForm to the existing import from '../types/insights'

// ---- Module 3: Form & Momentum (pure) ----
// activePlayerNames maps id -> name so requested players with zero games still appear.
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
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run src/services/insightsService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/insightsService.ts server/src/services/insightsService.test.ts
git commit -m "feat(insights): form & momentum computation (Module 3)"
```

---

### Task 5: Season Recap computation (Module 4)

**Files:**
- Modify: `server/src/services/insightsService.ts`
- Modify: `server/src/services/insightsService.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `insightsService.test.ts`:

```typescript
import { computeSeasonRecap } from './insightsService';

describe('computeSeasonRecap', () => {
  const current = [
    makeSession('s1', '2026-02-01T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 40, rebuys: 0 }, // +30
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 0, rebuys: 1 }, // -10
    ]),
    makeSession('s2', '2026-03-01T00:00:00.000Z', [
      { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 5, rebuys: 0 }, // -5
      { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 30, rebuys: 0 }, // +20
    ]),
  ];

  it('crowns champion by total profit and attendance king by games played', () => {
    const recap = computeSeasonRecap(current, [], '2026');
    expect(recap.period).toBe('2026');
    expect(recap.totalSessions).toBe(2);
    expect(recap.totalPot).toBe(40); // (10+10) + (10+10)
    expect(recap.champion).toMatchObject({ playerName: 'Alice', value: 25 }); // +30 -5
    expect(recap.attendanceKing!.value).toBe(2); // tie -> first by profit order, both played 2
    expect(recap.bestSingleNight).toMatchObject({ playerName: 'Alice', value: 30 });
    expect(recap.mostRebuys).toMatchObject({ playerName: 'Bob', value: 1 });
  });

  it('computes biggest mover vs the previous period ranking', () => {
    // Previous period: Bob was champion (rank 1), Alice rank 2.
    const previous = [
      makeSession('p1', '2025-05-01T00:00:00.000Z', [
        { playerId: 'a', playerName: 'Alice', buyIn: 10, cashOut: 0, rebuys: 0 }, // -10 rank2
        { playerId: 'b', playerName: 'Bob', buyIn: 10, cashOut: 30, rebuys: 0 }, // +20 rank1
      ]),
    ];
    const recap = computeSeasonRecap(current, previous, '2026');
    // Current ranking: Alice rank1 (+25), Bob rank2 (+10). Alice moved 2->1 = +1.
    expect(recap.biggestMover).toMatchObject({ playerName: 'Alice', positionsGained: 1 });
  });

  it('returns nulls for an empty period', () => {
    const recap = computeSeasonRecap([], [], '2026');
    expect(recap.totalSessions).toBe(0);
    expect(recap.champion).toBeNull();
    expect(recap.biggestMover).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx vitest run src/services/insightsService.test.ts`
Expected: FAIL — `computeSeasonRecap` not exported.

- [ ] **Step 3: Implement**

Append to `insightsService.ts` (add `SeasonRecap`, `SeasonSuperlative`, `RecordEntry` already imported):

```typescript
// add SeasonRecap, SeasonSuperlative to the existing import from '../types/insights'

// ---- Module 4: Season Recap (pure) ----
interface PlayerTotals {
  playerId: string;
  playerName: string;
  totalProfit: number;
  games: number;
}

function rankByProfit(sessions: SessionRow[]): PlayerTotals[] {
  const totals = new Map<string, PlayerTotals>();
  for (const s of sessions) {
    for (const e of s.entries) {
      const t =
        totals.get(e.playerId) ??
        { playerId: e.playerId, playerName: e.playerName, totalProfit: 0, games: 0 };
      t.totalProfit += calculateProfit(e.cashOut, e.buyIn);
      t.games += 1;
      totals.set(e.playerId, t);
    }
  }
  return [...totals.values()].sort((a, b) => b.totalProfit - a.totalProfit);
}

export function computeSeasonRecap(
  periodSessions: SessionRow[],
  previousSessions: SessionRow[],
  period: string
): SeasonRecap {
  const base: SeasonRecap = {
    period,
    totalSessions: periodSessions.length,
    totalPot: round(
      periodSessions.reduce(
        (sum, s) => sum + s.entries.reduce((es, e) => es + e.buyIn, 0),
        0
      )
    ),
    champion: null,
    attendanceKing: null,
    biggestMover: null,
    bestSingleNight: null,
    mostRebuys: null,
  };
  if (periodSessions.length === 0) return base;

  const ranking = rankByProfit(periodSessions);

  const champion: SeasonSuperlative | null = ranking.length
    ? { playerId: ranking[0].playerId, playerName: ranking[0].playerName, value: round(ranking[0].totalProfit) }
    : null;

  const byGames = [...ranking].sort((a, b) => b.games - a.games);
  const attendanceKing: SeasonSuperlative | null = byGames.length
    ? { playerId: byGames[0].playerId, playerName: byGames[0].playerName, value: byGames[0].games }
    : null;

  // Reuse records computation for best single night + most rebuys within the period.
  const records = computeRecords(periodSessions);
  const bestSingleNight = records.biggestWin;
  const mostRebuys: SeasonSuperlative | null = records.mostRebuys
    ? {
        playerId: records.mostRebuys.playerId,
        playerName: records.mostRebuys.playerName,
        value: records.mostRebuys.value,
      }
    : null;

  // Biggest mover: improvement in rank vs previous period (players present in both).
  let biggestMover: SeasonRecap['biggestMover'] = null;
  if (previousSessions.length) {
    const prevRanking = rankByProfit(previousSessions);
    const prevRank = new Map(prevRanking.map((p, i) => [p.playerId, i + 1]));
    const currRank = new Map(ranking.map((p, i) => [p.playerId, i + 1]));
    for (const p of ranking) {
      const before = prevRank.get(p.playerId);
      const now = currRank.get(p.playerId);
      if (before === undefined || now === undefined) continue;
      const gained = before - now; // positive => improved
      if (gained > 0 && (!biggestMover || gained > biggestMover.positionsGained)) {
        biggestMover = { playerId: p.playerId, playerName: p.playerName, positionsGained: gained };
      }
    }
  }

  return {
    ...base,
    champion,
    attendanceKing,
    biggestMover,
    bestSingleNight,
    mostRebuys,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd server && npx vitest run src/services/insightsService.test.ts`
Expected: PASS (all four module computations green).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/insightsService.ts server/src/services/insightsService.test.ts
git commit -m "feat(insights): season recap computation (Module 4)"
```

---

### Task 6: Service data-fetching methods + class export

**Files:**
- Modify: `server/src/services/insightsService.ts`

The pure functions are tested. Now add the DB layer: a class that fetches rows and maps them into `SessionRow`, then delegates. RebuyEvent rows are counted per (session, player).

- [ ] **Step 1: Add the fetch helper and class methods**

Append to `insightsService.ts`:

```typescript
// ---- Data access ----
// Fetch non-deleted sessions for a group as SessionRow[] with rebuy counts.
async function fetchSessionRows(
  groupId: string,
  where: { gte?: Date; lte?: Date } = {}
): Promise<SessionRow[]> {
  const dateFilter =
    where.gte || where.lte ? { date: { ...(where.gte && { gte: where.gte }), ...(where.lte && { lte: where.lte }) } } : {};

  const sessions = await prisma.session.findMany({
    where: { groupId, deletedAt: null, ...dateFilter },
    include: {
      entries: { include: { player: true } },
      rebuyEvents: true,
    },
    orderBy: { date: 'asc' },
  });

  return sessions.map((s) => {
    const rebuysByPlayer = new Map<string, number>();
    for (const r of s.rebuyEvents) {
      rebuysByPlayer.set(r.playerId, (rebuysByPlayer.get(r.playerId) ?? 0) + 1);
    }
    return {
      id: s.id,
      date: s.date.toISOString(),
      entries: s.entries.map((e) => ({
        playerId: e.playerId,
        playerName: e.player.name,
        buyIn: e.buyIn,
        cashOut: e.cashOut,
        rebuyCount: rebuysByPlayer.get(e.playerId) ?? 0,
      })),
    };
  });
}

export class InsightsService {
  async getRecords(groupId: string): Promise<GroupRecords> {
    const rows = await fetchSessionRows(groupId);
    return computeRecords(rows);
  }

  async getHeadToHead(
    groupId: string,
    playerA?: string,
    playerB?: string
  ): Promise<HeadToHeadResponse> {
    const rows = await fetchSessionRows(groupId);
    return computeHeadToHead(rows, playerA, playerB);
  }

  async getForm(groupId: string): Promise<PlayerForm[]> {
    const rows = await fetchSessionRows(groupId);
    const players = await prisma.player.findMany({
      where: { groupId, isActive: true },
      select: { id: true, name: true },
    });
    const names = new Map(players.map((p) => [p.id, p.name]));
    return computeForm(rows, players.map((p) => p.id), names);
  }

  async getSeasonRecap(groupId: string, year: number): Promise<SeasonRecap> {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);
    const prevStart = new Date(year - 1, 0, 1);
    const prevEnd = new Date(year - 1, 11, 31, 23, 59, 59);

    const [periodRows, previousRows] = await Promise.all([
      fetchSessionRows(groupId, { gte: start, lte: end }),
      fetchSessionRows(groupId, { gte: prevStart, lte: prevEnd }),
    ]);
    return computeSeasonRecap(periodRows, previousRows, String(year));
  }
}

export const insightsService = new InsightsService();
```

- [ ] **Step 2: Verify the whole server compiles**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Re-run unit tests (no regressions)**

Run: `cd server && npx vitest run src/services/insightsService.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/insightsService.ts
git commit -m "feat(insights): service data-fetching methods"
```

---

### Task 7: Controllers + routes

**Files:**
- Modify: `server/src/controllers/statsController.ts`
- Modify: `server/src/routes/stats.ts`

- [ ] **Step 1: Add controller functions**

Append to `statsController.ts` (add `insightsService` import at top: `import { insightsService } from '../services/insightsService';`):

```typescript
export const getGroupRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const records = await insightsService.getRecords(groupId);
    res.json(records);
  } catch (error) {
    next(error);
  }
};

export const getGroupHeadToHead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const playerA = typeof req.query.playerA === 'string' ? req.query.playerA : undefined;
    const playerB = typeof req.query.playerB === 'string' ? req.query.playerB : undefined;
    const result = await insightsService.getHeadToHead(groupId, playerA, playerB);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getGroupForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const form = await insightsService.getForm(groupId);
    res.json(form);
  } catch (error) {
    next(error);
  }
};

export const getSeasonRecap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const recap = await insightsService.getSeasonRecap(groupId, year);
    res.json(recap);
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Register routes**

In `server/src/routes/stats.ts`, add to the controller import list:

```typescript
  getGroupRecords,
  getGroupHeadToHead,
  getGroupForm,
  getSeasonRecap,
```

And add the routes before `export default router;`:

```typescript
// Insights endpoints
router.get('/groups/:groupId/records', getGroupRecords);
router.get('/groups/:groupId/head-to-head', getGroupHeadToHead);
router.get('/groups/:groupId/form', getGroupForm);
router.get('/groups/:groupId/season', getSeasonRecap);
```

- [ ] **Step 3: Verify compile**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/statsController.ts server/src/routes/stats.ts
git commit -m "feat(insights): controllers and routes for insights endpoints"
```

---

### Task 8: Integration tests for the four endpoints

**Files:**
- Modify: `server/tests/integration/api.test.ts`

The integration suite uses `supertest` against `../../src/app`. These tests assert the endpoints return 200 with the right top-level shape against whatever seeded/empty data exists (so they don't depend on specific fixtures — they assert structure and status, which is the appropriate altitude for integration here).

- [ ] **Step 1: Add failing tests**

Append to `api.test.ts` (reuse the existing `request`/`app` imports). First fetch a valid groupId from the groups endpoint:

```typescript
describe('insights endpoints', () => {
  let groupId: string;

  it('resolves a group id to test against', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) groupId = res.body[0].id;
  });

  it('GET /stats/groups/:groupId/records returns the records shape', async () => {
    if (!groupId) return; // no seed data -> skip body assertions
    const res = await request(app).get(`/api/stats/groups/${groupId}/records`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('biggestWin');
    expect(res.body).toHaveProperty('biggestPot');
    expect(res.body).toHaveProperty('longestWinStreak');
  });

  it('GET /stats/groups/:groupId/head-to-head returns rivalry shape', async () => {
    if (!groupId) return;
    const res = await request(app).get(`/api/stats/groups/${groupId}/head-to-head`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pair');
    expect(res.body).toHaveProperty('biggestRivalry');
    expect(Array.isArray(res.body.playerInsights)).toBe(true);
  });

  it('GET /stats/groups/:groupId/form returns an array', async () => {
    if (!groupId) return;
    const res = await request(app).get(`/api/stats/groups/${groupId}/form`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /stats/groups/:groupId/season returns recap shape', async () => {
    if (!groupId) return;
    const res = await request(app).get(`/api/stats/groups/${groupId}/season?year=2026`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('period', '2026');
    expect(res.body).toHaveProperty('champion');
  });
});
```

- [ ] **Step 2: Run the integration suite**

Run: `cd server && npm run test:integration`
Expected: PASS (the new describe block green; assertions skipped only if no group data).

- [ ] **Step 3: Commit**

```bash
git add server/tests/integration/api.test.ts
git commit -m "test(insights): integration coverage for insights endpoints"
```

---

### Task 9: Frontend types + API client + hooks

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/lib/api.ts`
- Create: `client/src/hooks/useInsights.ts`

- [ ] **Step 1: Add frontend types**

Append to `client/src/types/index.ts` (these mirror `server/src/types/insights.ts` exactly):

```typescript
// ---- Insights ----
export interface RecordEntry {
  playerId: string;
  playerName: string;
  sessionId: string;
  date: string;
  value: number;
}
export interface StreakRecord {
  playerId: string;
  playerName: string;
  count: number;
}
export interface PotRecord {
  sessionId: string;
  date: string;
  total: number;
}
export interface GroupRecords {
  biggestWin: RecordEntry | null;
  biggestLoss: RecordEntry | null;
  biggestComeback: RecordEntry | null;
  longestWinStreak: StreakRecord | null;
  longestLossStreak: StreakRecord | null;
  mostRebuys: RecordEntry | null;
  bestRoiNight: RecordEntry | null;
  biggestPot: PotRecord | null;
}
export interface PairStats {
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  sharedSessions: number;
  aWins: number;
  bWins: number;
  ties: number;
  profitDifferential: number;
  currentStreakHolder: string | null;
  currentStreakCount: number;
}
export interface PlayerRivalryInsight {
  playerId: string;
  playerName: string;
  bogey: { playerId: string; playerName: string; lossesTo: number } | null;
  favoriteVictim: { playerId: string; playerName: string; winsOver: number } | null;
}
export interface HeadToHeadResponse {
  pair: PairStats | null;
  biggestRivalry: PairStats | null;
  playerInsights: PlayerRivalryInsight[];
}
export interface PlayerForm {
  playerId: string;
  playerName: string;
  recentResults: number[];
  recentWins: number;
  recentGames: number;
  trajectory: 'up' | 'down' | 'flat';
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
  badge: 'heater' | 'slump' | null;
}
export interface SeasonSuperlative {
  playerId: string;
  playerName: string;
  value: number;
}
export interface SeasonRecap {
  period: string;
  totalSessions: number;
  totalPot: number;
  champion: SeasonSuperlative | null;
  attendanceKing: SeasonSuperlative | null;
  biggestMover: { playerId: string; playerName: string; positionsGained: number } | null;
  bestSingleNight: RecordEntry | null;
  mostRebuys: SeasonSuperlative | null;
}
```

- [ ] **Step 2: Add the API client group**

In `client/src/lib/api.ts`, add the imports to the existing `import type { ... } from '@/types'` line: `GroupRecords, HeadToHeadResponse, PlayerForm, SeasonRecap`. Then add after `statsApi`:

```typescript
// Insights
export const insightsApi = {
  getRecords: (groupId: string) =>
    api.get<GroupRecords>(`/stats/groups/${groupId}/records`),
  getHeadToHead: (groupId: string, playerA?: string, playerB?: string) =>
    api.get<HeadToHeadResponse>(`/stats/groups/${groupId}/head-to-head`, {
      params: { playerA, playerB },
    }),
  getForm: (groupId: string) =>
    api.get<PlayerForm[]>(`/stats/groups/${groupId}/form`),
  getSeasonRecap: (groupId: string, year: number) =>
    api.get<SeasonRecap>(`/stats/groups/${groupId}/season`, { params: { year } }),
};
```

- [ ] **Step 3: Create the hooks**

```typescript
// client/src/hooks/useInsights.ts
import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '@/lib/api';

export const useRecords = (groupId: string) =>
  useQuery({
    queryKey: ['insights', 'records', groupId],
    queryFn: async () => (await insightsApi.getRecords(groupId)).data,
    enabled: !!groupId,
  });

export const useHeadToHead = (groupId: string, playerA?: string, playerB?: string) =>
  useQuery({
    queryKey: ['insights', 'h2h', groupId, playerA, playerB],
    queryFn: async () => (await insightsApi.getHeadToHead(groupId, playerA, playerB)).data,
    enabled: !!groupId,
  });

export const useForm = (groupId: string) =>
  useQuery({
    queryKey: ['insights', 'form', groupId],
    queryFn: async () => (await insightsApi.getForm(groupId)).data,
    enabled: !!groupId,
  });

export const useSeasonRecap = (groupId: string, year: number) =>
  useQuery({
    queryKey: ['insights', 'season', groupId, year],
    queryFn: async () => (await insightsApi.getSeasonRecap(groupId, year)).data,
    enabled: !!groupId,
  });
```

- [ ] **Step 4: Verify client compiles**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/types/index.ts client/src/lib/api.ts client/src/hooks/useInsights.ts
git commit -m "feat(insights): frontend types, api client, query hooks"
```

---

### Task 10: Shared chart layer (theme + Sparkline + RankRaceChart)

**Files:**
- Create: `client/src/components/insights/charts/chartTheme.ts`
- Create: `client/src/components/insights/charts/Sparkline.tsx`
- Create: `client/src/components/insights/charts/RankRaceChart.tsx`

- [ ] **Step 1: Create the theme**

```typescript
// client/src/components/insights/charts/chartTheme.ts
// Centralized palette + formatters for the Insights "nicer graphs" layer.
export const CHART = {
  grid: '#374151',
  axis: '#9CA3AF',
  zeroLine: '#6B7280',
  positive: '#10B981',
  negative: '#EF4444',
  // Stable per-series palette for multi-player charts.
  series: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4'],
};

export const colorForIndex = (i: number) => CHART.series[i % CHART.series.length];

export const formatCurrency = (value: number) =>
  `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(0)}`;

export const formatSignedCurrency = (value: number) =>
  `${value >= 0 ? '+' : ''}$${value.toFixed(0)}`;
```

- [ ] **Step 2: Create the Sparkline**

```tsx
// client/src/components/insights/charts/Sparkline.tsx
import { LineChart, Line, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CHART } from './chartTheme';

interface SparklineProps {
  values: number[]; // oldest -> newest
  height?: number;
}

// Compact momentum sparkline: green if the latest value is up, red if down.
const Sparkline = ({ values, height = 36 }: SparklineProps) => {
  if (values.length === 0) {
    return <div className="text-xs text-muted-foreground">No recent games</div>;
  }
  const data = values.map((v, i) => ({ i, v }));
  const trendUp = values[values.length - 1] >= 0;
  const stroke = trendUp ? CHART.positive : CHART.negative;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <ReferenceLine y={0} stroke={CHART.zeroLine} strokeDasharray="2 2" />
        <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} dot={false} isAnimationActive />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default Sparkline;
```

- [ ] **Step 3: Create the RankRaceChart (bump chart)**

This chart takes sessions and the leaderboard players, then plots each player's cumulative-profit rank across sessions. It computes its own series from the sessions passed in (same `Session` type the Analytics page uses).

```tsx
// client/src/components/insights/charts/RankRaceChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseLocalDate } from '@/lib/dateUtils';
import { colorForIndex } from './chartTheme';
import type { Session } from '@/types';

interface RankRaceChartProps {
  sessions: Session[];
}

// Builds rank-over-time: lower rank number = better (1 = leader). Inverted Y axis.
const RankRaceChart = ({ sessions }: RankRaceChartProps) => {
  const ordered = [...sessions].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
  );

  const cumulative = new Map<string, number>(); // playerId -> cumulative profit
  const names = new Map<string, string>();
  const rows: Record<string, number | string>[] = [];

  for (const s of ordered) {
    for (const e of s.entries ?? []) {
      names.set(e.playerId, e.player?.name ?? e.playerId);
      cumulative.set(e.playerId, (cumulative.get(e.playerId) ?? 0) + (e.cashOut - e.buyIn));
    }
    const ranked = [...cumulative.entries()].sort((a, b) => b[1] - a[1]);
    const row: Record<string, number | string> = {
      date: parseLocalDate(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    ranked.forEach(([playerId], idx) => {
      row[playerId] = idx + 1;
    });
    rows.push(row);
  }

  const playerIds = [...names.keys()];
  const maxRank = playerIds.length || 1;

  if (rows.length === 0 || playerIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>The Race for #1</CardTitle>
          <CardDescription>Leaderboard rank over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Play a few more nights to see the race
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>The Race for #1</CardTitle>
        <CardDescription>Leaderboard rank after each night (1 = leader)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={rows} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            <YAxis
              reversed
              allowDecimals={false}
              domain={[1, maxRank]}
              ticks={Array.from({ length: maxRank }, (_, i) => i + 1)}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
            />
            <Legend />
            {playerIds.map((id, i) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={names.get(id)}
                stroke={colorForIndex(i)}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
                isAnimationActive
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default RankRaceChart;
```

- [ ] **Step 4: Verify compile**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/insights/charts/
git commit -m "feat(insights): shared chart theme, sparkline, rank-race bump chart"
```

---

### Task 11: RecordsModule component

**Files:**
- Create: `client/src/components/insights/RecordsModule.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// client/src/components/insights/RecordsModule.tsx
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingDown, Flame, Zap, RefreshCw, Percent, Coins, Award } from 'lucide-react';
import { useRecords } from '@/hooks/useInsights';
import { formatSignedCurrency } from './charts/chartTheme';
import type { GroupRecords } from '@/types';

interface RecordsModuleProps {
  groupId: string;
}

const RecordCard = ({
  icon,
  label,
  holder,
  value,
  sessionId,
}: {
  icon: React.ReactNode;
  label: string;
  holder: string | null;
  value: string | null;
  sessionId?: string;
}) => {
  const body = (
    <Card className="h-full transition-colors hover:border-primary/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {holder ? (
          <>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{holder}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No record yet</p>
        )}
      </CardContent>
    </Card>
  );
  return sessionId ? <Link to={`/sessions/${sessionId}`}>{body}</Link> : body;
};

const RecordsModule = ({ groupId }: RecordsModuleProps) => {
  const { data, isLoading } = useRecords(groupId);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading records…</div>;
  }

  const r: GroupRecords | undefined = data;
  if (!r) return null;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-yellow-500" /> Hall of Fame
        </h2>
        <p className="text-muted-foreground">Your group's all-time records</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RecordCard
          icon={<Trophy className="h-4 w-4 text-green-500" />}
          label="Biggest Win"
          holder={r.biggestWin?.playerName ?? null}
          value={r.biggestWin ? formatSignedCurrency(r.biggestWin.value) : null}
          sessionId={r.biggestWin?.sessionId}
        />
        <RecordCard
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          label="Biggest Loss"
          holder={r.biggestLoss?.playerName ?? null}
          value={r.biggestLoss ? formatSignedCurrency(r.biggestLoss.value) : null}
          sessionId={r.biggestLoss?.sessionId}
        />
        <RecordCard
          icon={<Zap className="h-4 w-4 text-amber-500" />}
          label="Biggest Comeback"
          holder={r.biggestComeback?.playerName ?? null}
          value={r.biggestComeback ? formatSignedCurrency(r.biggestComeback.value) : null}
          sessionId={r.biggestComeback?.sessionId}
        />
        <RecordCard
          icon={<Coins className="h-4 w-4 text-yellow-500" />}
          label="Biggest Pot"
          holder={r.biggestPot ? 'That night' : null}
          value={r.biggestPot ? `$${r.biggestPot.total.toFixed(0)}` : null}
          sessionId={r.biggestPot?.sessionId}
        />
        <RecordCard
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="Longest Win Streak"
          holder={r.longestWinStreak?.playerName ?? null}
          value={r.longestWinStreak ? `${r.longestWinStreak.count} nights` : null}
        />
        <RecordCard
          icon={<TrendingDown className="h-4 w-4 text-blue-500" />}
          label="Longest Loss Streak"
          holder={r.longestLossStreak?.playerName ?? null}
          value={r.longestLossStreak ? `${r.longestLossStreak.count} nights` : null}
        />
        <RecordCard
          icon={<RefreshCw className="h-4 w-4 text-purple-500" />}
          label="Most Rebuys (1 night)"
          holder={r.mostRebuys?.playerName ?? null}
          value={r.mostRebuys ? `${r.mostRebuys.value}` : null}
          sessionId={r.mostRebuys?.sessionId}
        />
        <RecordCard
          icon={<Percent className="h-4 w-4 text-teal-500" />}
          label="Best ROI Night"
          holder={r.bestRoiNight?.playerName ?? null}
          value={r.bestRoiNight ? `${r.bestRoiNight.value.toFixed(0)}%` : null}
          sessionId={r.bestRoiNight?.sessionId}
        />
      </div>
    </section>
  );
};

export default RecordsModule;
```

- [ ] **Step 2: Verify compile**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/insights/RecordsModule.tsx
git commit -m "feat(insights): Records module UI"
```

---

### Task 12: FormBoardModule component

**Files:**
- Create: `client/src/components/insights/FormBoardModule.tsx`

- [ ] **Step 1: Implement**

```tsx
// client/src/components/insights/FormBoardModule.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus, Flame, Snowflake, Activity } from 'lucide-react';
import { useForm } from '@/hooks/useInsights';
import Sparkline from './charts/Sparkline';

interface FormBoardModuleProps {
  groupId: string;
}

const TrajectoryIcon = ({ t }: { t: 'up' | 'down' | 'flat' }) => {
  if (t === 'up') return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  if (t === 'down') return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const FormBoardModule = ({ groupId }: FormBoardModuleProps) => {
  const { data, isLoading } = useForm(groupId);

  if (isLoading) return <div className="text-muted-foreground">Loading form…</div>;
  const players = data ?? [];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-500" /> Form & Momentum
        </h2>
        <p className="text-muted-foreground">Who's hot and who's cold right now</p>
      </div>
      {players.length === 0 ? (
        <p className="text-muted-foreground">No active players yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => (
            <Card key={p.playerId}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    {p.playerName}
                    {p.badge === 'heater' && <Flame className="h-4 w-4 text-orange-500" />}
                    {p.badge === 'slump' && <Snowflake className="h-4 w-4 text-blue-400" />}
                  </span>
                  <TrajectoryIcon t={p.trajectory} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Sparkline values={p.recentResults} />
                <p className="mt-2 text-sm text-muted-foreground">
                  {p.recentGames > 0
                    ? `${p.recentWins}/${p.recentGames} wins recently`
                    : 'No recent games'}
                  {p.streakType !== 'none' && p.currentStreak > 1
                    ? ` · ${p.currentStreak} ${p.streakType} streak`
                    : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default FormBoardModule;
```

- [ ] **Step 2: Verify compile**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/insights/FormBoardModule.tsx
git commit -m "feat(insights): Form & Momentum board UI"
```

---

### Task 13: RivalriesModule component

**Files:**
- Create: `client/src/components/insights/RivalriesModule.tsx`

- [ ] **Step 1: Implement**

```tsx
// client/src/components/insights/RivalriesModule.tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords } from 'lucide-react';
import { useHeadToHead } from '@/hooks/useInsights';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { formatSignedCurrency } from './charts/chartTheme';
import type { PairStats } from '@/types';

interface RivalriesModuleProps {
  groupId: string;
}

const PairCard = ({ pair, title, description }: { pair: PairStats; title: string; description?: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-red-500" /> {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-2">
      <p className="text-lg font-semibold">
        {pair.playerAName} <span className="text-muted-foreground">vs</span> {pair.playerBName}
      </p>
      <p className="text-3xl font-bold">
        {pair.aWins} <span className="text-muted-foreground text-xl">–</span> {pair.bWins}
        {pair.ties > 0 && <span className="text-base text-muted-foreground"> ({pair.ties} ties)</span>}
      </p>
      <p className="text-sm text-muted-foreground">
        {pair.sharedSessions} nights together · {pair.playerAName} differential{' '}
        <span className={pair.profitDifferential >= 0 ? 'text-green-500' : 'text-red-500'}>
          {formatSignedCurrency(pair.profitDifferential)}
        </span>
      </p>
      {pair.currentStreakHolder && pair.currentStreakCount > 1 && (
        <p className="text-sm font-medium">
          {pair.currentStreakHolder} on a {pair.currentStreakCount}-night run
        </p>
      )}
    </CardContent>
  </Card>
);

const RivalriesModule = ({ groupId }: RivalriesModuleProps) => {
  const { data: players } = usePlayersByGroup(groupId);
  const [playerA, setPlayerA] = useState<string>('');
  const [playerB, setPlayerB] = useState<string>('');
  const { data, isLoading } = useHeadToHead(groupId, playerA || undefined, playerB || undefined);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-red-500" /> Rivalries
        </h2>
        <p className="text-muted-foreground">Head-to-head bragging rights</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data?.biggestRivalry && (
          <PairCard
            pair={data.biggestRivalry}
            title="The Biggest Rivalry"
            description="Most nights played against each other"
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Compare Two Players</CardTitle>
            <CardDescription>Pick a matchup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-border bg-background p-2 text-sm"
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
              >
                <option value="">Player A</option>
                {players?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                className="flex-1 rounded-md border border-border bg-background p-2 text-sm"
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
              >
                <option value="">Player B</option>
                {players?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {playerA && playerB && data && !data.pair && (
              <p className="text-sm text-muted-foreground">These two haven't shared a table yet.</p>
            )}
            {data?.pair && <PairCard pair={data.pair} title="Matchup" />}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default RivalriesModule;
```

- [ ] **Step 2: Verify compile**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/insights/RivalriesModule.tsx
git commit -m "feat(insights): Rivalries / head-to-head UI"
```

---

### Task 14: SeasonRecapModule component

**Files:**
- Create: `client/src/components/insights/SeasonRecapModule.tsx`

- [ ] **Step 1: Implement**

```tsx
// client/src/components/insights/SeasonRecapModule.tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Users, TrendingUp, Star, RefreshCw } from 'lucide-react';
import { useSeasonRecap } from '@/hooks/useInsights';
import { formatSignedCurrency } from './charts/chartTheme';

interface SeasonRecapModuleProps {
  groupId: string;
}

const Superlative = ({
  icon,
  label,
  name,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  name: string | null;
  detail: string | null;
}) => (
  <div className="flex items-start gap-3 rounded-lg border border-border p-3">
    <div className="mt-0.5">{icon}</div>
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {name ? (
        <>
          <p className="font-semibold">{name}</p>
          {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  </div>
);

const SeasonRecapModule = ({ groupId }: SeasonRecapModuleProps) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useSeasonRecap(groupId, year);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" /> Poker Wrapped
          </h2>
          <p className="text-muted-foreground">Your season in review</p>
        </div>
        <select
          className="rounded-md border border-border bg-background p-2 text-sm"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data?.period ?? year} Season</CardTitle>
          <CardDescription>
            {data ? `${data.totalSessions} nights · $${data.totalPot.toFixed(0)} on the table` : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : data && data.totalSessions === 0 ? (
            <p className="text-muted-foreground">No sessions played in {year}.</p>
          ) : data ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Superlative
                icon={<Crown className="h-5 w-5 text-yellow-500" />}
                label="Champion"
                name={data.champion?.playerName ?? null}
                detail={data.champion ? formatSignedCurrency(data.champion.value) : null}
              />
              <Superlative
                icon={<TrendingUp className="h-5 w-5 text-green-500" />}
                label="Biggest Mover"
                name={data.biggestMover?.playerName ?? null}
                detail={data.biggestMover ? `+${data.biggestMover.positionsGained} spots` : null}
              />
              <Superlative
                icon={<Users className="h-5 w-5 text-blue-500" />}
                label="Attendance King"
                name={data.attendanceKing?.playerName ?? null}
                detail={data.attendanceKing ? `${data.attendanceKing.value} nights` : null}
              />
              <Superlative
                icon={<Star className="h-5 w-5 text-amber-500" />}
                label="Best Single Night"
                name={data.bestSingleNight?.playerName ?? null}
                detail={data.bestSingleNight ? formatSignedCurrency(data.bestSingleNight.value) : null}
              />
              <Superlative
                icon={<RefreshCw className="h-5 w-5 text-purple-500" />}
                label="Most Rebuys"
                name={data.mostRebuys?.playerName ?? null}
                detail={data.mostRebuys ? `${data.mostRebuys.value} rebuys` : null}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
};

export default SeasonRecapModule;
```

- [ ] **Step 2: Verify compile**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/insights/SeasonRecapModule.tsx
git commit -m "feat(insights): Season Recap (Poker Wrapped) UI"
```

---

### Task 15: Insights page + route + nav + shortcut + command palette

**Files:**
- Create: `client/src/pages/Insights.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/NavBar.tsx`
- Modify: `client/src/hooks/useKeyboardShortcuts.ts`
- Modify: `client/src/components/CommandPalette.tsx`

- [ ] **Step 1: Create the page**

```tsx
// client/src/pages/Insights.tsx
import { useGroupContext } from '@/context/GroupContext';
import { useSessionsByGroup } from '@/hooks/useSessions';
import RecordsModule from '@/components/insights/RecordsModule';
import FormBoardModule from '@/components/insights/FormBoardModule';
import RivalriesModule from '@/components/insights/RivalriesModule';
import SeasonRecapModule from '@/components/insights/SeasonRecapModule';
import RankRaceChart from '@/components/insights/charts/RankRaceChart';

const Insights = () => {
  const { selectedGroup } = useGroupContext();
  const groupId = selectedGroup?.id || '';
  const { data: sessions } = useSessionsByGroup(groupId);

  if (!groupId) {
    return <div className="text-muted-foreground">Select a group to see insights.</div>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-muted-foreground">The story of your game</p>
      </div>

      <RecordsModule groupId={groupId} />
      <RankRaceChart sessions={sessions ?? []} />
      <FormBoardModule groupId={groupId} />
      <RivalriesModule groupId={groupId} />
      <SeasonRecapModule groupId={groupId} />
    </div>
  );
};

export default Insights;
```

- [ ] **Step 2: Register the route**

In `client/src/App.tsx`, add the import alongside the other page imports:

```typescript
import Insights from './pages/Insights';
```

And add the route inside the `<Route element={<AppLayout />}>` block, after the analytics route:

```tsx
<Route path="/insights" element={<Insights />} />
```

- [ ] **Step 3: Add the nav item**

In `client/src/components/layout/NavBar.tsx`, add `Sparkles` to the lucide-react import, and add a nav entry after the Analytics entry:

```typescript
  { path: '/insights', label: 'Insights', icon: Sparkles },
```

- [ ] **Step 4: Add the keyboard shortcut**

In `client/src/hooks/useKeyboardShortcuts.ts`, inside the `if (lastKey === 'g')` switch, add a case (after the `'a'` case):

```typescript
          case 'i':
            navigate('/insights');
            break;
```

- [ ] **Step 5: Add the command-palette entry**

In `client/src/components/CommandPalette.tsx`, find the navigation command group (where Dashboard/Sessions/etc. are registered) and add an Insights command following the exact pattern already used there. The command runs `navigate('/insights')` and is labeled `Insights` (use the `Sparkles` icon if the other items use icons).

Read the file first to match the existing structure; mirror the Analytics entry exactly, substituting `/insights`, `Insights`, and `Sparkles`.

- [ ] **Step 6: Verify the client builds**

Run: `cd client && npx tsc --noEmit && npm run build`
Expected: type check passes and Vite build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/Insights.tsx client/src/App.tsx client/src/components/layout/NavBar.tsx client/src/hooks/useKeyboardShortcuts.ts client/src/components/CommandPalette.tsx
git commit -m "feat(insights): Insights page, route, nav item, G+I shortcut, command palette"
```

---

### Task 16: E2E test

**Files:**
- Create: `e2e/insights.spec.ts`

Look at an existing spec in `e2e/` first to match base URL/fixtures/setup conventions (e.g. how a group is selected before navigation). Mirror that setup; the assertions below are the insights-specific part.

- [ ] **Step 1: Write the E2E spec**

```typescript
// e2e/insights.spec.ts
import { test, expect } from '@playwright/test';

// NOTE: mirror group-selection setup from an existing e2e spec if the app
// requires choosing a group before the main nav is available.

test.describe('Insights', () => {
  test('navigates to Insights and renders all modules', async ({ page }) => {
    await page.goto('/');
    // Select a group if the app lands on group selection (match existing specs).
    // ...group selection setup...

    await page.goto('/insights');
    await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hall of Fame' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Form & Momentum' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rivalries' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Poker Wrapped' })).toBeVisible();
  });

  test('G+I keyboard shortcut navigates to Insights', async ({ page }) => {
    await page.goto('/');
    // ...group selection setup...
    await page.keyboard.press('g');
    await page.keyboard.press('i');
    await expect(page).toHaveURL(/\/insights$/);
  });
});
```

- [ ] **Step 2: Run the E2E suite**

Run: `npm run test:e2e -- insights.spec.ts`
Expected: PASS (adjust group-selection setup until green).

- [ ] **Step 3: Commit**

```bash
git add e2e/insights.spec.ts
git commit -m "test(insights): e2e coverage for Insights page and shortcut"
```

---

### Task 17: Full verification + docs

**Files:**
- Modify: `DOCS.md` (move the relevant items out of "Future Features" and document the Insights area)

- [ ] **Step 1: Run the entire test suite**

Run from repo root:
```bash
cd server && npm test && npm run test:integration && cd .. && cd client && npx tsc --noEmit && cd .. && npm run test:e2e
```
Expected: all green. (Per the green-before-merge rule, do not merge unless this passes.)

- [ ] **Step 2: Update DOCS.md**

In `DOCS.md`: add an "Insights" subsection under Features describing the four modules and the `G+I` shortcut + `/insights` route; remove "Player vs Player Head-to-Head Stats" and "Advanced Analytics Dashboard" from the Future Features list (now delivered). Add the `G + I` row to the keyboard-shortcuts tables in `DOCS.md` and `README.md`.

- [ ] **Step 3: Commit**

```bash
git add DOCS.md README.md
git commit -m "docs(insights): document the Insights area and shortcut"
```

---

## Self-Review Notes

- **Spec coverage:** Module 1 (Records) → Tasks 2, 11. Module 2 (Rivalries/H2H) → Tasks 3, 13. Module 3 (Form) → Tasks 4, 12. Module 4 (Season) → Tasks 5, 14. Shared chart layer + signature visuals (bump chart, sparklines) → Task 10 (sparkline used in Task 12, bump chart used in Task 15). Nav/route/shortcut/placement → Task 15. No schema changes (confirmed — all derived in Task 6 via `fetchSessionRows`). Testing requirements → Tasks 2–5 (unit), 8 (integration), 16 (E2E). Empty/tie handling → covered in unit tests and component empty states.
- **Type consistency:** `SessionRow`/`EntryRow` defined in Task 2 and reused in Tasks 3–6. Backend types in Task 1 mirrored exactly in frontend Task 9. Function names stable: `computeRecords`, `computeHeadToHead`, `computeForm`, `computeSeasonRecap`, `fetchSessionRows`, service methods `getRecords/getHeadToHead/getForm/getSeasonRecap`, hooks `useRecords/useHeadToHead/useForm/useSeasonRecap`, API `insightsApi`.
- **No placeholders** in code steps except Task 15 Step 5 and Task 16 Step 1, which explicitly instruct reading an existing file (CommandPalette / e2e spec) to mirror an established local pattern that varies — the safest instruction rather than guessing the exact structure.

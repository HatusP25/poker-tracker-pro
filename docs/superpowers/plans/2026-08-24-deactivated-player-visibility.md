# Deactivated Player Visibility (F-14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a deactivated player absent from every derived surface (leaderboard, records, charts, belt, achievements, season recaps) while staying fully present in the record of every night they actually played.

**Architecture:** One new pure function, `filterRowsToActive`, applied in the service layer between data access and computation. All eight existing `compute*` rule functions and their test files stay untouched. Two direct Prisma queries (`getLeaderboard`, `getDashboardStats`) get an `isActive` filter instead. Client call sites pass the already-existing but unused `activeOnly` param.

**Tech Stack:** Node 20, Express, TypeScript, Prisma, Vitest (unit + integration), React 18, TanStack Query, Playwright.

**Spec:** [2026-08-24-deactivated-player-visibility-design.md](../specs/2026-08-24-deactivated-player-visibility-design.md)

---

## File Structure

**Create:**
- `server/src/services/activeRoster.ts` — the pure filter + the one query helper. Single responsibility: "given a set of active player ids, remove everyone else from already-fetched session rows."
- `server/src/services/activeRoster.test.ts` — unit tests for the pure function.
- `server/tests/integration/deactivation.test.ts` — end-to-end API behavior across all surfaces.
- `docs/follow-ups/2026-08-24-net-group-profit-is-always-zero.md` — tracked deferred work.

**Modify:**
- `server/src/services/insightsService.ts` — 4 service methods apply the filter.
- `server/src/services/banterService.ts` — 2 service methods apply the filter.
- `server/src/services/statsService.ts` — leaderboard query + dashboard aggregation.
- `server/src/services/sessionSummaryService.ts` — D-D split (cross-night rules filter, night facts stay whole).
- `server/src/services/sessionService.ts` — add `isActive` to the entry's player select.
- `server/src/types/index.ts` — `LeaderboardEntry`, `DashboardStats`.
- `client/src/types/index.ts` — mirror the server types, add `SessionEntry.player.isActive`.
- 6 client components — pass `activeOnly`.
- `client/src/pages/Rankings.tsx`, `Dashboard.tsx`, `Analytics.tsx` + 5 analytics chart components.

---

## Task 1: The pure filter

**Files:**
- Create: `server/src/services/activeRoster.ts`
- Test: `server/src/services/activeRoster.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/services/activeRoster.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterRowsToActive } from './activeRoster';

const row = (
  id: string,
  entries: string[],
  rebuyPlayers?: string[]
) => ({
  id,
  date: '2026-01-01',
  entries: entries.map((playerId) => ({ playerId, buyIn: 20, cashOut: 30 })),
  ...(rebuyPlayers && {
    rebuyEvents: rebuyPlayers.map((playerId) => ({ playerId, amount: 20 })),
  }),
});

describe('filterRowsToActive', () => {
  it('removes entries for players outside the active set', () => {
    const rows = [row('s1', ['alice', 'bob'])];
    const out = filterRowsToActive(rows, new Set(['alice']));

    expect(out).toHaveLength(1);
    expect(out[0].entries.map((e) => e.playerId)).toEqual(['alice']);
  });

  it('strips rebuyEvents in lockstep with entries', () => {
    const rows = [row('s1', ['alice', 'bob'], ['alice', 'bob', 'bob'])];
    const out = filterRowsToActive(rows, new Set(['alice']));

    expect(out[0].rebuyEvents!.map((r) => r.playerId)).toEqual(['alice']);
  });

  it('drops sessions left with no entries', () => {
    const rows = [row('s1', ['bob']), row('s2', ['alice'])];
    const out = filterRowsToActive(rows, new Set(['alice']));

    expect(out.map((r) => r.id)).toEqual(['s2']);
  });

  it('leaves fully-active rows untouched', () => {
    const rows = [row('s1', ['alice', 'bob'], ['alice'])];
    const out = filterRowsToActive(rows, new Set(['alice', 'bob']));

    expect(out).toEqual(rows);
  });

  it('returns no rows when the active set is empty', () => {
    expect(filterRowsToActive([row('s1', ['alice'])], new Set())).toEqual([]);
  });

  it('preserves fields it does not own', () => {
    const rows = [{ ...row('s1', ['alice']), status: 'COMPLETED', deletedAt: null }];
    const out = filterRowsToActive(rows, new Set(['alice']));

    expect(out[0].status).toBe('COMPLETED');
    expect(out[0].deletedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/services/activeRoster.test.ts`
Expected: FAIL — `Failed to resolve import "./activeRoster"`.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/services/activeRoster.ts`:

```ts
import { prisma } from '../lib/prisma';

/**
 * The shape `filterRowsToActive` needs. Deliberately minimal so the three row
 * types in play — insightsService's `SessionRow`, banterService's
 * `BanterSessionRow`, and sessionSummaryRules' `SummarySessionRow` — all satisfy
 * it without changing.
 */
export interface ActiveFilterableRow {
  entries: { playerId: string }[];
  rebuyEvents?: { playerId: string }[];
}

/**
 * Remove every trace of non-active players from already-fetched session rows.
 *
 * This is the single point where deactivation is applied. Services call it
 * between fetching and computing, which keeps every `compute*` rule function
 * unaware that deactivation exists.
 *
 * Three responsibilities, all load-bearing:
 *  1. Strip entries for players outside `activeIds`.
 *  2. Strip those players' rebuyEvents *in lockstep* — otherwise achievements
 *     and the "most rebuys" record count rebuys with no matching entry.
 *  3. Drop sessions left with no entries. `computeBeltLineage` increments
 *     `nightsHeld` before checking whether anyone played, so an empty night
 *     would hand the current champion a free reign defence.
 */
export function filterRowsToActive<T extends ActiveFilterableRow>(
  rows: T[],
  activeIds: ReadonlySet<string>
): T[] {
  const out: T[] = [];

  for (const row of rows) {
    const entries = row.entries.filter((e) => activeIds.has(e.playerId));
    if (entries.length === 0) continue;

    // Spread-over-generic needs the assertion; the shape is unchanged, only the
    // two arrays are narrowed.
    out.push({
      ...row,
      entries,
      ...(row.rebuyEvents !== undefined && {
        rebuyEvents: row.rebuyEvents.filter((r) => activeIds.has(r.playerId)),
      }),
    } as T);
  }

  return out;
}

/** The group's active roster, as an id set ready for `filterRowsToActive`. */
export async function fetchActivePlayerIds(groupId: string): Promise<Set<string>> {
  const players = await prisma.player.findMany({
    where: { groupId, isActive: true },
    select: { id: true },
  });
  return new Set(players.map((p) => p.id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/services/activeRoster.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/activeRoster.ts server/src/services/activeRoster.test.ts
git commit -m "feat(players): pure active-roster row filter (F-14)"
```

---

## Task 2: Insights surfaces

**Files:**
- Modify: `server/src/services/insightsService.ts:495-561`

- [ ] **Step 1: Add the import**

At the top of `server/src/services/insightsService.ts`, after the `previousSeason` import:

```ts
import { filterRowsToActive, fetchActivePlayerIds } from './activeRoster';
```

- [ ] **Step 2: Apply the filter in all four methods**

Replace the `getRecords`, `getHeadToHead`, and `getForm` methods:

```ts
  async getRecords(groupId: string): Promise<GroupRecords> {
    const [rows, activeIds] = await Promise.all([
      fetchSessionRows(groupId),
      fetchActivePlayerIds(groupId),
    ]);
    return computeRecords(filterRowsToActive(rows, activeIds));
  }

  async getHeadToHead(
    groupId: string,
    playerA?: string,
    playerB?: string
  ): Promise<HeadToHeadResponse> {
    const [rows, activeIds] = await Promise.all([
      fetchSessionRows(groupId),
      fetchActivePlayerIds(groupId),
    ]);
    return computeHeadToHead(filterRowsToActive(rows, activeIds), playerA, playerB);
  }

  async getForm(groupId: string): Promise<PlayerForm[]> {
    const [rows, players] = await Promise.all([
      fetchSessionRows(groupId),
      prisma.player.findMany({
        where: { groupId, isActive: true },
        select: { id: true, name: true },
      }),
    ]);
    const activeIds = new Set(players.map((p) => p.id));
    const names = new Map(players.map((p) => [p.id, p.name]));
    return computeForm(
      filterRowsToActive(rows, activeIds),
      players.map((p) => p.id),
      names
    );
  }
```

In `getSeasonRecapForSeason`, after the existing `Promise.all` that produces `periodRows` and `previousRows`, replace the final return:

```ts
    const activeIds = await fetchActivePlayerIds(groupId);
    return computeSeasonRecap(
      filterRowsToActive(periodRows, activeIds),
      filterRowsToActive(previousRows, activeIds),
      season.name
    );
```

In `getSeasonRecap`, replace the final return the same way:

```ts
    const activeIds = await fetchActivePlayerIds(groupId);
    return computeSeasonRecap(
      filterRowsToActive(periodRows, activeIds),
      filterRowsToActive(previousRows, activeIds),
      String(year)
    );
```

- [ ] **Step 3: Verify nothing regressed**

Run: `cd server && npx vitest run src/services/insightsService.test.ts && npx tsc --noEmit`
Expected: PASS, all existing tests green and no type errors. Existing tests passing unchanged is the proof the shim avoided signature churn.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/insightsService.ts
git commit -m "feat(insights): exclude deactivated players from records, rivalries, recaps (F-14)"
```

---

## Task 3: Belt and achievements

**Files:**
- Modify: `server/src/services/banterService.ts:442-452`

- [ ] **Step 1: Add the import**

After the `withDerivedRebuyEvents` import in `server/src/services/banterService.ts`:

```ts
import { filterRowsToActive, fetchActivePlayerIds } from './activeRoster';
```

- [ ] **Step 2: Apply the filter**

Replace the `BanterService` class body:

```ts
export class BanterService {
  async getBelt(groupId: string): Promise<BeltLineage> {
    const [rows, activeIds] = await Promise.all([
      fetchBanterSessionRows(groupId),
      fetchActivePlayerIds(groupId),
    ]);
    return computeBeltLineage(filterRowsToActive(rows, activeIds));
  }

  async getAchievements(groupId: string): Promise<AchievementsResponse> {
    const [rows, activeIds] = await Promise.all([
      fetchBanterSessionRows(groupId),
      fetchActivePlayerIds(groupId),
    ]);
    return computeAchievements(filterRowsToActive(rows, activeIds));
  }
}
```

- [ ] **Step 3: Verify nothing regressed**

Run: `cd server && npx vitest run src/services/banterService.test.ts && npx tsc --noEmit`
Expected: PASS, all existing tests green.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/banterService.ts
git commit -m "feat(banter): deactivated players lose the belt and drop from achievements (F-14)"
```

---

## Task 4: Leaderboard

**Files:**
- Modify: `server/src/services/statsService.ts:201-202`, `server/src/services/statsService.ts:262`
- Modify: `server/src/types/index.ts:43`
- Modify: `client/src/types/index.ts:131`
- Modify: `client/src/pages/Rankings.tsx:221-224`

- [ ] **Step 1: Filter the query**

In `server/src/services/statsService.ts`, in `getLeaderboard`, change the `where` clause:

```ts
    const players = await prisma.player.findMany({
      where: { groupId, isActive: true },
```

- [ ] **Step 2: Drop the now-always-true field**

In the same method, delete this line from the `leaderboard.push({...})` object:

```ts
        isActive: player.isActive,
```

In `server/src/types/index.ts`, delete `isActive: boolean;` from `LeaderboardEntry` (line 43).

In `client/src/types/index.ts`, delete `isActive: boolean;` from `LeaderboardEntry` (line 131).

- [ ] **Step 3: Remove the dead badge**

In `client/src/pages/Rankings.tsx`, replace the name cell:

```tsx
                    <TableCell className="font-medium">
                      {player.playerName}
                    </TableCell>
```

- [ ] **Step 4: Verify**

Run: `cd server && npx tsc --noEmit && cd ../client && npx tsc --noEmit`
Expected: PASS. If the client typecheck flags another `isActive` reader on `LeaderboardEntry`, remove that usage too.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/statsService.ts server/src/types/index.ts client/src/types/index.ts client/src/pages/Rankings.tsx
git commit -m "feat(stats): leaderboard excludes deactivated players (F-14)"
```

---

## Task 5: Dashboard aggregation

**Files:**
- Modify: `server/src/services/statsService.ts:336-418`
- Modify: `server/src/types/index.ts:66-87`
- Modify: `client/src/types/index.ts:134-155`
- Modify: `client/src/pages/Dashboard.tsx:92-96`

- [ ] **Step 1: Update the response types**

In `server/src/types/index.ts`, in `DashboardStats`: delete the `activePlayers: number;` line, and change the `recentSessions` winner to `winner: string | null;`.

Mirror both changes in `client/src/types/index.ts` `DashboardStats`.

- [ ] **Step 2: Rework the aggregation**

In `server/src/services/statsService.ts` `getDashboardStats`, replace the block from `const totalSessions` through the `recentSessions` mapping:

```ts
    const totalSessions = group.sessions.length;
    // Per D-B: the roster counter is about who is *in* the group now.
    const totalPlayers = group.players.filter(p => p.isActive).length;

    // Per D-B this is a group-level money total, so it stays whole. Computing it
    // from the already-fetched entries (rather than summing leaderboard balances)
    // keeps it independent of the leaderboard's active-only filter, with no
    // extra query.
    const netGroupProfit = group.sessions.reduce(
      (sum, s) => sum + s.entries.reduce((es, e) => es + calculateProfit(e.cashOut, e.buyIn), 0),
      0
    );

    const leaderboard = await this.getLeaderboard(groupId);

    // Pot sizes stay whole (D-B).
    const totalBuyIns = group.sessions.reduce(
      (sum, s) => sum + s.entries.reduce((entrySum, e) => entrySum + e.buyIn, 0),
      0
    );
    const avgSessionSize = totalSessions > 0 ? totalBuyIns / totalSessions : 0;

    const lastSessionDate = group.sessions.length > 0 ? group.sessions[0].date : null;

    const topPlayers = leaderboard.slice(0, 3).map(p => ({
      playerId: p.playerId,
      playerName: p.playerName,
      balance: p.balance,
      roi: p.roi,
      totalGames: p.totalGames,
    }));

    const recentSessions = group.sessions.slice(0, 5).map(s => {
      // The winner is a per-player callout, so it is active-only. A night where
      // no active player played has no winner — and the old unguarded reduce
      // threw a TypeError on an empty array.
      const activeEntries = s.entries.filter(e => e.player.isActive);
      const winner = activeEntries.length > 0
        ? activeEntries.reduce((max, e) =>
            calculateProfit(e.cashOut, e.buyIn) > calculateProfit(max.cashOut, max.buyIn) ? e : max
          ).player.name
        : null;

      return {
        sessionId: s.id,
        date: s.date,
        // Player count and pot describe the night, not the roster (D-B).
        playerCount: s.entries.length,
        winner,
        totalPot: round(s.entries.reduce((sum, e) => sum + e.buyIn, 0)),
      };
    });
```

Then delete `activePlayers,` from the returned object.

- [ ] **Step 3: Update the Dashboard tile**

In `client/src/pages/Dashboard.tsx`, replace the Players card content:

```tsx
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPlayers || 0}</div>
            <p className="text-xs text-muted-foreground">active in this group</p>
          </CardContent>
```

- [ ] **Step 4: Handle the nullable winner in the UI**

Run: `cd client && npx tsc --noEmit`

Wherever the typecheck flags `recentSessions[].winner` as possibly null, render a dash:

```tsx
{session.winner ?? '—'}
```

- [ ] **Step 5: Verify**

Run: `cd server && npx tsc --noEmit && npm test && cd ../client && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/statsService.ts server/src/types/index.ts client/src/types/index.ts client/src/pages/Dashboard.tsx
git commit -m "feat(stats): dashboard shows active roster and active-only winners (F-14)"
```

---

## Task 6: Session summary — the D-D split

**Files:**
- Modify: `server/src/services/sessionSummaryService.ts:42-112`

Per spec D-D: cross-night rules get filtered history **and** a filtered night-entry list; the night's own facts keep the whole entry list.

- [ ] **Step 1: Add the import**

After the existing imports in `server/src/services/sessionSummaryService.ts`:

```ts
import { filterRowsToActive, fetchActivePlayerIds } from './activeRoster';
```

- [ ] **Step 2: Build both entry lists and split the rules**

Replace everything from `const cutoff = session.date.toISOString();` to the end of the returned object:

```ts
    const activeIds = await fetchActivePlayerIds(groupId);

    // D-D: cross-night rules (ranks, streaks, milestones) are derived surfaces
    // and exclude deactivated players. The night's own facts — pot, player
    // count, highlights, titles — describe the evening as it happened (D-A).
    //
    // Both inputs must be filtered together: all three cross-night rules iterate
    // the night's entry list and look each player up in the history. Filtering
    // only the history would render a deactivated player as a rank-0 "brand new
    // player" with a streak computed from nothing.
    const activeRows = filterRowsToActive(rows, activeIds);
    const activeEntries = entries.filter((e) => activeIds.has(e.playerId));

    const cutoff = session.date.toISOString();
    const rankingsBefore = computeRankings(sessionsUpTo(activeRows, cutoff, true));
    const rankingsAfter = computeRankings(sessionsUpTo(activeRows, cutoff, false));

    // Recorded rebuys win; nights that never recorded any derive from the totals.
    const rebuyEvents = withDerivedRebuyEvents(
      session.entries,
      session.rebuyEvents,
      session.group.defaultBuyIn
    );
    const rebuysByPlayer = new Map<string, number>();
    for (const r of rebuyEvents) {
      rebuysByPlayer.set(r.playerId, (rebuysByPlayer.get(r.playerId) ?? 0) + 1);
    }

    return {
      session: {
        id: session.id,
        date: session.date.toISOString(),
        playerCount: session.entries.length,
        totalPot: session.entries.reduce((sum, e) => sum + e.buyIn, 0),
      },
      rankingChanges: computeRankingChanges(activeEntries, rankingsBefore, rankingsAfter),
      highlights: computeHighlights(entries, rebuysByPlayer),
      streaks: computeStreakUpdates(activeRows, activeEntries, cutoff),
      milestones: computeMilestones(activeRows, activeEntries, cutoff, rankingsBefore, rankingsAfter),
      titles: computeNightTitles(entries, rebuyEvents),
    };
```

- [ ] **Step 3: Verify**

Run: `cd server && npx tsc --noEmit && npx vitest run src/services/sessionSummaryRules.test.ts`
Expected: PASS — the rules themselves are unchanged, so their tests must still be green.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/sessionSummaryService.ts
git commit -m "feat(sessions): summary ranks and streaks exclude deactivated players (F-14)"
```

---

## Task 7: Expose `isActive` to the client

The Analytics page aggregates raw session entries. `SessionEntry.player` is a narrow select without `isActive`, so it cannot filter today.

**Files:**
- Modify: `server/src/services/sessionService.ts:44-52`
- Modify: `client/src/types/index.ts:68-72`

- [ ] **Step 1: Widen the select**

In `server/src/services/sessionService.ts`, in `getSessionsByGroup`, add `isActive` to the player select:

```ts
            player: {
              select: {
                id: true,
                name: true,
                nickname: true,
                isActive: true,
              },
            },
```

- [ ] **Step 2: Mirror in the client type**

In `client/src/types/index.ts`, in `SessionEntry`:

```ts
  player?: {
    id: string;
    name: string;
    nickname?: string | null;
    isActive?: boolean;
  };
```

`isActive` is optional because other endpoints return the narrower shape.

- [ ] **Step 3: Verify**

Run: `cd server && npx tsc --noEmit && cd ../client && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/sessionService.ts client/src/types/index.ts
git commit -m "feat(sessions): expose player isActive on session entries (F-14)"
```

---

## Task 8: Client roster pickers

Six components fetch the full roster for pickers, dropdowns, and charts. `usePlayersByGroup` already accepts `activeOnly`; no call site passes it.

**Files:**
- Modify: `client/src/components/dashboard/PlayerPerformanceChart.tsx:13`
- Modify: `client/src/components/insights/RivalriesModule.tsx:45`
- Modify: `client/src/components/insights/BeltCard.tsx:40`
- Modify: `client/src/components/sessions/SessionForm.tsx:66`
- Modify: `client/src/components/import/ImportDialog.tsx:36`
- Modify: `client/src/pages/Sessions.tsx:34`

- [ ] **Step 1: Pass `activeOnly` at each site**

Add `, true` as the second argument in each of the six files:

```tsx
// PlayerPerformanceChart.tsx:13
const { data: players = [] } = usePlayersByGroup(groupId, true);

// RivalriesModule.tsx:45
const { data: players } = usePlayersByGroup(groupId, true);

// BeltCard.tsx:40
const { data: players = [] } = usePlayersByGroup(groupId, true);

// SessionForm.tsx:66
const { data: players = [] } = usePlayersByGroup(groupId, true);

// ImportDialog.tsx:36
const { data: players } = usePlayersByGroup(selectedGroup?.id || '', true);

// Sessions.tsx:34
const { data: players } = usePlayersByGroup(selectedGroup?.id || '', true);
```

Leave `client/src/pages/Players.tsx:35` unfiltered — the Players tab is the carve-out.

- [ ] **Step 2: Verify**

Run: `cd client && npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dashboard/PlayerPerformanceChart.tsx client/src/components/insights/RivalriesModule.tsx client/src/components/insights/BeltCard.tsx client/src/components/sessions/SessionForm.tsx client/src/components/import/ImportDialog.tsx client/src/pages/Sessions.tsx
git commit -m "feat(client): roster pickers show active players only (F-14)"
```

---

## Task 9: Analytics page

Analytics aggregates raw session entries client-side. Per D-B, `avgPotSize` and `avgPlayersPerSession` keep using **unfiltered** entries; every per-player figure filters.

**Files:**
- Modify: `client/src/pages/Analytics.tsx:47-92`
- Modify: `client/src/components/analytics/TopPerformances.tsx:21-35`
- Modify: `client/src/components/analytics/MoneyRaceChart.tsx:36`

- [ ] **Step 1: Add a shared helper**

Create the helper inline at the top of `client/src/pages/Analytics.tsx`, after the imports:

```ts
/**
 * Deactivated players are absent from every derived surface (F-14). Session
 * entries carry `player.isActive`; treat a missing flag as active so narrower
 * endpoints keep working.
 */
const isActiveEntry = (entry: { player?: { isActive?: boolean } }) =>
  entry.player?.isActive !== false;
```

- [ ] **Step 2: Filter the per-player summary tiles**

In `Analytics.tsx`, inside the `stats` memo, change the per-entry loop to skip inactive players. Replace the `session.entries?.forEach(...)` block:

```ts
      session.entries?.filter(isActiveEntry).forEach(entry => {
        if (entry.player) {
          playerParticipation[entry.player.name] = (playerParticipation[entry.player.name] || 0) + 1;

          const profit = entry.cashOut - entry.buyIn;
          if (profit > biggestWin) {
            biggestWin = profit;
          }
        }
      });
```

Leave `totalPot` and `totalPlayers +=` accumulation above it untouched — those feed `avgPotSize` and `avgPlayersPerSession`, which stay whole per D-B.

- [ ] **Step 3: Filter TopPerformances**

In `client/src/components/analytics/TopPerformances.tsx`, in the performance-collection loop, skip inactive players:

```tsx
    session.entries?.forEach(entry => {
      if (entry.player && entry.player.isActive !== false) {
```

- [ ] **Step 4: Filter the money race**

In `client/src/components/analytics/MoneyRaceChart.tsx`, filter entries before computing. Replace line 36:

```tsx
  const activeOnly = sessions.map((s) => ({
    ...s,
    entries: s.entries?.filter((e) => e.player?.isActive !== false),
  }));
  const { rows, players } = computeMoneyRace(activeOnly);
```

`PlayerComparisonChart` needs no change — it is fed the leaderboard, which Task 4 already filtered. `ProfitByLocationChart` and `RecentActivity` are session-level, not per-player, so they stay whole per D-B.

- [ ] **Step 5: Verify**

Run: `cd client && npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Analytics.tsx client/src/components/analytics/TopPerformances.tsx client/src/components/analytics/MoneyRaceChart.tsx
git commit -m "feat(analytics): charts and tiles exclude deactivated players (F-14)"
```

---

## Task 10: Integration tests

**Files:**
- Create: `server/tests/integration/deactivation.test.ts`

**Harness notes (already verified — follow exactly):**
- Import `app` from `../../src/app`, not `src/index`.
- `server/tests/integration/setup.ts` truncates **every table in `beforeEach`**. Each `it` must seed its own data; there is no shared suite-level fixture.
- Stats routes are mounted under `/api/stats`, so the leaderboard is `/api/stats/groups/:groupId/leaderboard`. Player routes are under `/api/players`.

- [ ] **Step 1: Write the test**

Create `server/tests/integration/deactivation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/lib/prisma';

/**
 * F-14: a deactivated player is absent from every derived surface, and fully
 * present in the record of every night they actually played.
 *
 * Seed shape: Carol wins the most recent night outright, so she holds the belt
 * and tops the leaderboard while active. Deactivating her must move both.
 */
async function seed() {
  const group = await prisma.group.create({
    data: { name: 'Deactivation Test Group', defaultBuyIn: 10 },
  });

  const [alice, bob, carol] = await Promise.all(
    ['Alice', 'Bob', 'Carol'].map((name) =>
      prisma.player.create({ data: { groupId: group.id, name } })
    )
  );

  const night1 = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-03-01T00:00:00.000Z'),
      status: 'COMPLETED',
      completedAt: new Date('2026-03-01T00:00:00.000Z'),
      entries: {
        create: [
          { playerId: alice.id, buyIn: 10, cashOut: 25 },
          { playerId: bob.id, buyIn: 10, cashOut: 5 },
          { playerId: carol.id, buyIn: 10, cashOut: 0 },
        ],
      },
    },
  });

  // Carol takes the most recent night by a wide margin.
  const night2 = await prisma.session.create({
    data: {
      groupId: group.id,
      date: new Date('2026-04-01T00:00:00.000Z'),
      status: 'COMPLETED',
      completedAt: new Date('2026-04-01T00:00:00.000Z'),
      entries: {
        create: [
          { playerId: alice.id, buyIn: 10, cashOut: 2 },
          { playerId: bob.id, buyIn: 10, cashOut: 8 },
          { playerId: carol.id, buyIn: 10, cashOut: 20 },
        ],
      },
    },
  });

  return { group, alice, bob, carol, night1, night2 };
}

const deactivate = (playerId: string) =>
  request(app).patch(`/api/players/${playerId}/toggle-active`);

describe('F-14 deactivated player visibility', () => {
  it('removes a deactivated player from the leaderboard', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/leaderboard`);

    expect(res.status).toBe(200);
    expect(res.body.map((e: any) => e.playerName)).toEqual(
      expect.not.arrayContaining(['Carol'])
    );
    expect(res.body).toHaveLength(2);
  });

  it('re-ranks the remaining players contiguously from 1', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/leaderboard`);

    expect(res.body.map((e: any) => e.rank)).toEqual([1, 2]);
  });

  it('passes the belt to the most recent active winner', async () => {
    const { group, carol } = await seed();

    const before = await request(app).get(`/api/stats/groups/${group.id}/belt`);
    expect(before.body.current.playerName).toBe('Carol');

    await deactivate(carol.id);

    const after = await request(app).get(`/api/stats/groups/${group.id}/belt`);
    expect(after.body.current.playerName).toBe('Bob');
  });

  it('drops the deactivated player from records, recap and achievements', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);

    for (const path of ['records', 'season?year=2026', 'achievements']) {
      const res = await request(app).get(`/api/stats/groups/${group.id}/${path}`);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain('Carol');
    }
  });

  it('keeps the session they played intact and still balanced', async () => {
    const { carol, night2 } = await seed();
    await deactivate(carol.id);

    const session = await request(app).get(`/api/sessions/${night2.id}`);
    expect(session.body.entries.map((e: any) => e.player.name)).toContain('Carol');

    const balance = await request(app).get(`/api/stats/sessions/${night2.id}/balance-check`);
    expect(balance.body.isBalanced).toBe(true);
  });

  it('keeps night-level totals whole but reports an active-only winner', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/dashboard`);

    // D-B: the night had three players and a $30 pot, and still does.
    const latest = res.body.recentSessions[0];
    expect(latest.playerCount).toBe(3);
    expect(latest.totalPot).toBe(30);
    // Carol actually won that night, but the callout is active-only.
    expect(latest.winner).toBe('Bob');
    // The roster counter is the active roster.
    expect(res.body.totalPlayers).toBe(2);
  });

  it('returns a null winner for a night only deactivated players played', async () => {
    const { group, alice, bob, carol } = await seed();
    await prisma.session.create({
      data: {
        groupId: group.id,
        date: new Date('2026-05-01T00:00:00.000Z'),
        status: 'COMPLETED',
        completedAt: new Date('2026-05-01T00:00:00.000Z'),
        entries: { create: [{ playerId: carol.id, buyIn: 10, cashOut: 10 }] },
      },
    });
    await deactivate(carol.id);

    const res = await request(app).get(`/api/stats/groups/${group.id}/dashboard`);

    // Must not throw — the old unguarded reduce would have 500'd here.
    expect(res.status).toBe(200);
    expect(res.body.recentSessions[0].winner).toBeNull();
    expect([alice.id, bob.id]).toHaveLength(2);
  });

  it('splits the session summary per D-D', async () => {
    const { group, carol, night2 } = await seed();
    await deactivate(carol.id);

    const res = await request(app).get(
      `/api/stats/sessions/${night2.id}/summary?groupId=${group.id}`
    );

    expect(res.status).toBe(200);
    // Cross-night rules are derived surfaces: Carol is absent, and crucially
    // does not appear as a rank-0 "brand new player" row.
    expect(res.body.rankingChanges.map((c: any) => c.playerName)).not.toContain('Carol');
    expect(res.body.rankingChanges.every((c: any) => c.newRank > 0)).toBe(true);
    expect(res.body.streaks.map((s: any) => s.playerName)).not.toContain('Carol');
    // The night's own facts stay whole.
    expect(res.body.session.playerCount).toBe(3);
    expect(res.body.session.totalPot).toBe(30);
  });

  it('restores every surface when the player is reactivated', async () => {
    const { group, carol } = await seed();
    await deactivate(carol.id);
    await deactivate(carol.id); // toggle back

    const [leaderboard, belt] = await Promise.all([
      request(app).get(`/api/stats/groups/${group.id}/leaderboard`),
      request(app).get(`/api/stats/groups/${group.id}/belt`),
    ]);

    expect(leaderboard.body.map((e: any) => e.playerName)).toContain('Carol');
    expect(belt.body.current.playerName).toBe('Carol');
  });
});
```

- [ ] **Step 2: Run it**

Run: `cd server && npm run test:integration -- deactivation`
Expected: PASS, 9 tests.

If the summary route's group id is passed differently than `?groupId=`, check `server/src/controllers/statsController.ts` `getSessionSummary` and adjust that one call.

- [ ] **Step 4: Commit**

```bash
git add server/tests/integration/deactivation.test.ts
git commit -m "test(players): integration coverage for deactivated player visibility (F-14)"
```

---

## Task 11: Full verification

- [ ] **Step 1: Run the whole suite**

```bash
cd server && npm test
cd server && npm run test:integration
cd client && npx tsc --noEmit
cd client && npm test
npm run test:e2e
```

Expected: all green. Per CLAUDE.md §2 rule 1, nothing merges until this passes.

- [ ] **Step 2: Fix anything red before proceeding**

Do not continue to docs with a red suite.

---

## Task 12: Documentation

**Files:**
- Modify: `CHANGELOG.md`, `docs/WORKLOG.md`, `docs/DECISIONS.md`, `BACKLOG.md`, `DOCS.md`
- Create: `docs/follow-ups/2026-08-24-net-group-profit-is-always-zero.md`

- [ ] **Step 1: Add decision D-006**

Append to `docs/DECISIONS.md`, following the existing D-00N format, recording the four decisions from the spec (§3 D-A through D-D) and their consequences.

- [ ] **Step 2: Write the follow-up**

Create `docs/follow-ups/2026-08-24-net-group-profit-is-always-zero.md`, self-contained and actionable cold: `netGroupProfit` sums every player's balance in a zero-sum game, so it is always ≈ $0 and is a near-meaningless Dashboard headline. Note that F-14 deliberately left it whole (D-B) rather than redesigning the tile, and suggest "total money staked" as a candidate replacement.

- [ ] **Step 3: Update the living docs**

- `CHANGELOG.md` — one entry describing the shipped behavior.
- `docs/WORKLOG.md` — newest-first entry with files touched and verification run.
- `BACKLOG.md` — remove or move the F-14 item.
- `DOCS.md` — update the `LeaderboardEntry` and `DashboardStats` shapes (dropped `isActive`, dropped `activePlayers`, nullable `winner`) and note that leaderboard/records/belt/recap are active-only.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md docs/WORKLOG.md docs/DECISIONS.md BACKLOG.md DOCS.md docs/follow-ups/
git commit -m "docs: record F-14 deactivated player visibility"
```

---

## Task 13: Hand back — do NOT push

- [ ] **Step 1: Confirm the branch state**

```bash
git log --oneline main..HEAD
git status
```

- [ ] **Step 2: Stop**

The user has explicitly asked that this **not** be pushed to production yet, because the app is in active use. Leave the work on `feat/f12-deactivated-players`. Do not merge to `main` and do not push. Report the branch state and wait.

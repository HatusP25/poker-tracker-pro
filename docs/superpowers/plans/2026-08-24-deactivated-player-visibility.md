# Deactivated Player Visibility (F-14) — As-Built

**Status:** shipped 2026-09-07.
**Spec:** [2026-08-24-deactivated-player-visibility-design.md](../specs/2026-08-24-deactivated-player-visibility-design.md)

> The original bite-sized plan targeted the pre-restructure codebase and is not what shipped. It was
> written against a working tree sitting on `origin/main` (the F-11 merge) while local `main` was 52
> commits ahead with the stats restructure — `Rankings.tsx`, `Analytics.tsx`, `TopPerformances.tsx`
> and `PlayerPerformanceChart.tsx` had been deleted, `statsService` split into `statsRules`, and the
> angles engine added. A trial merge produced 12 conflicts, three of them modify/delete. The work was
> rebuilt on current `main` instead; this file records what was actually done.

## Order of work

1. **`server/src/services/activeRoster.ts`** (new, 8 unit tests). `filterRowsToActive(rows,
   activeIds, { dropEmpty })` strips inactive players' entries and their `rebuyEvents` in lockstep;
   `dropEmpty` (default true) controls whether emptied sessions survive. Plus `fetchActivePlayerIds`,
   the only impure export. Generic over all four row shapes, so none of them changed.
2. **`insightsService`** — filter in `getRecords`, `getHeadToHead`, `getForm`, both season recaps.
3. **`banterService`** — filter in `getBelt`, `getAchievements`.
4. **`sessionSummaryService`** — the D-D split: filtered history *and* filtered night entries into
   the three cross-night rules; whole entry list into highlights, titles and the header.
5. **`anglesService`** — roster query gains `isActive: true`; rows filtered with `dropEmpty: false`.
6. **`statsService.getLeaderboard`** — `where: { groupId, isActive: true }`.
7. **`statsRules.computeDashboardStats`** — optional `activePlayerIds` narrows the recent-night
   winner only (TDD: 2 failing tests first).
8. **Client** — eleven roster call sites pass `activeOnly`; `AppLayout` (colour registry) and
   `Players.tsx` (carve-out) deliberately left whole. Dead `inactive` badge removed from
   `StandingsTable`; `PlayerTab`'s roster note re-based on the player record.
9. **`server/tests/integration/deactivation.test.ts`** (new, 11 tests).

## Verification

| Suite | Result |
|---|---|
| Server unit | 354 passed (15 files) |
| Integration | 174 passed (14 files) |
| Client unit | 412 passed (27 files) |
| Typecheck | server + client clean |
| Playwright e2e | 18 passed |

Every pre-existing rule test passes unchanged — the evidence that the shim approach avoided
signature churn across `insightsService`, `banterService`, `sessionSummaryRules` and `anglesRules`.

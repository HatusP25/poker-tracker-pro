# Chart Truth & Polish — Design Spec

**Date:** 2026-07-12 · **Status:** approved (user: "Go ahead" on the chart-analysis recommendation)

## Why

Chart audit findings: Analytics' "Profit Over Time" sums profit across ALL players per
session — poker is zero-sum, so it plots ~$0 ± data-entry drift and presents it as
"cumulative profit" (misleading); Player Comparison caps at top 5, excluding friends in a
small group; four chart components are dead code; the single most-wanted poker-group chart
(cumulative $ per player over the season) doesn't exist.

Client-only wave. No server changes, no schema changes, no writes to data.

## Changes

### 1. The Money Race (replaces the zero-sum chart)
- Delete `client/src/components/analytics/ProfitChart.tsx`; add `MoneyRaceChart.tsx` in the
  same Analytics slot, consuming the same `sessions={filteredSessions}` prop (inherits the
  date-range filter).
- One line per player: cumulative profit over the filtered range, x = session date, carrying
  each player's last cumulative value forward through sessions they skipped (lines stay
  continuous). Players start at 0 at the start of the filtered range.
- Pure helper `computeMoneyRace(sessions)` in `client/src/lib/moneyRace.ts` + unit tests
  (multi-player accumulation, skipped-session carry-forward, empty input, date sorting).
- Tooltip lists players sorted by cumulative value desc; legend with player colors from the
  shared insights `chartTheme` palette (reuse `components/insights/charts/chartTheme.ts`).
- Title: "The Money Race" / description "Cumulative profit per player — who's winning the year".

### 2. Player Comparison shows everyone
- `PlayerComparisonChart.tsx`: drop the top-5 slice; all players, sorted by balance desc.
  Description text updated accordingly.

### 3. Belt timeline
- New `client/src/components/insights/BeltTimeline.tsx` rendered inside/under the existing
  `BeltCard`: a horizontal band of segments, one per reign, width proportional to
  `nightsHeld`, colored per holder (stable color per player, reuse chartTheme palette),
  hover/title shows holder, span dates, defenses. Plain flex/div implementation (no Recharts
  gantt); pure helper `computeBeltSegments(lineage)` in `client/src/lib/beltSegments.ts`
  + unit tests (proportions sum to 100%, single-reign, empty lineage).

### 4. Dead code removal
Delete (verified imported nowhere): `components/analytics/DayOfWeekChart.tsx`,
`components/analytics/SessionsChart.tsx`, `components/analytics/WinRateDistributionChart.tsx`,
`components/dashboard/ProfitTrendChart.tsx`.

## Testing
TDD the two pure helpers. `tsc --noEmit`, client unit suite, prod build green; full e2e run
by the supervisor before merge (existing insights/banter specs must still pass).

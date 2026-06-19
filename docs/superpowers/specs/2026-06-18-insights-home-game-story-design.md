# Insights: The Story of Your Game — Design Spec

**Date:** 2026-06-18
**Status:** Approved design, ready for implementation planning
**Author:** Brainstormed with the user

---

## 1. Summary

Poker Tracker Pro already has a solid **data toolbox** (`/analytics` — ~9 utilitarian
Recharts charts, leaderboard, ROI/win-rate stats, session summaries). What it lacks is a
**narrative-first experience** that turns the group's history into bragging rights, rivalries,
and shareable moments — the things that make a *home* game fun to track.

This spec adds a new top-level **Insights** area (`/insights`) with four modules plus a shared
"nicer graphs" visual layer. Everything is **derivable from data already stored** — no schema
changes, no migrations, and **no code paths that touch money/settlement logic.** It is purely
additive read-only analytics.

### Explicit non-goals

- **This is NOT a debt tracker.** No "who owes whom", no cross-session ledger, no payment status.
- **No grinder/bankroll metrics.** No $/hour, no variance/standard-deviation, no Sharpe-style
  efficiency stats. These were considered and explicitly rejected — they don't fit a social
  home game.
- No new data capture during live sessions or manual entry. Insights consume existing data only.

---

## 2. Goals & Success Criteria

**Goal:** Make the app's accumulated history *fun to revisit* and *worth sharing* with the group.

Success looks like:

- A player opens `/insights` and immediately sees something they want to screenshot and send to
  the group chat ("longest win streak", "you've topped Mike 5 nights running", "season champion").
- Records and rivalries update automatically as new sessions are recorded — no manual upkeep.
- The new visuals look noticeably more polished than the current flat charts.
- All new computations are unit-tested and the full suite stays green before merge
  (per the project's green-before-merge rule).

---

## 3. Approach

**Chosen: a dedicated `/insights` experience (modular cards), separate from `/analytics`.**

Rationale: `/analytics` is a *tool* (filter, compare, drill into numbers). Insights is a *story*
(records, rivalries, momentum, recap). Keeping them separate means the existing charts are
untouched and the fun content isn't buried among technical charts. All four modules and the
shared chart layer ship together as the MVP (user decision).

Rejected alternatives:

- **Bolt onto `/analytics`** — overcrowds an already busy page; story gets buried.
- **Full redesign of `/analytics` into a tabbed hub** — larger blast radius, reworks charts that
  already work; unnecessary now.

---

## 4. Architecture

### 4.1 Data foundation (no schema changes)

All modules read from existing models: `Session`, `SessionEntry`, `RebuyEvent`, `Player`.
Per-entry profit and rebuys are already computed via existing helpers in
`server/src/utils/calculations.ts` (`calculateProfit`, `calculateStreak`,
`calculateLongestWinStreak`, `calculateLongestLossStreak`). Soft-deleted sessions
(`deletedAt != null`) are excluded everywhere, matching existing service behavior.

### 4.2 Backend

New methods on the existing `StatsService` (`server/src/services/statsService.ts`), exposed via
the existing `/stats` route group (`server/src/routes/stats.ts` + `statsController.ts`). One new
endpoint per module:

| Endpoint | Returns |
|----------|---------|
| `GET /stats/groups/:groupId/records` | Hall of Fame records (module 1) |
| `GET /stats/groups/:groupId/head-to-head?playerA=&playerB=` | Pairwise H2H + auto-surfaced rivalries (module 2) |
| `GET /stats/groups/:groupId/form` | Group hot/cold momentum board (module 3) |
| `GET /stats/groups/:groupId/season?year=&season=` | Year/season recap (module 4) |

Each method is a pure read computation over fetched sessions/entries; no writes.

### 4.3 Frontend

- New route `GET /insights` registered in `client/src/App.tsx` inside the `AppLayout` group.
- New nav item **Insights** in `client/src/components/layout/NavBar.tsx` (icon: `Sparkles` or
  `Flame` from lucide-react), placed after `Analytics`.
- New keyboard shortcut **`G + I`** in `client/src/hooks/useKeyboardShortcuts.ts`
  (`case 'i': navigate('/insights')`), plus a command-palette entry.
- New page `client/src/pages/Insights.tsx` composing four module components under
  `client/src/components/insights/`.
- New TanStack Query hooks (e.g. `useRecords`, `useHeadToHead`, `useForm`, `useSeasonRecap`)
  following the existing `useQuery` pattern with `enabled: !!groupId`.
- Respects existing VIEWER/EDITOR roles: Insights is read-only, so it renders identically in both
  (no edit affordances to gate).

---

## 5. Modules

### Module 1 — Hall of Fame & Records

A records book for the group. Each record names the **holder** and links to the **session** where
it happened (route `/sessions/:id`).

Records (MVP set):

- **Biggest single-night win** — max `profit` across all entries.
- **Biggest single-night loss** — min `profit` across all entries.
- **Biggest comeback** — largest positive `profit` among entries whose `buyIn` reflects ≥2
  rebuys (i.e. was deep in and still cashed out ahead). Derived from `RebuyEvent` count /
  `buyIn` vs group `defaultBuyIn`.
- **Longest win streak** / **Longest loss streak** — reuse `calculateLongestWinStreak` /
  `calculateLongestLossStreak`.
- **Most rebuys in a night** — max `RebuyEvent` count for a player in one session.
- **Best ROI night** — max `profit / buyIn` for a single entry (min buy-in floor to avoid
  tiny-denominator noise).
- **Biggest pot night** — session with the largest total on the table (`sum(buyIn)`), reusing
  the `totalPot` concept already in `getAggregatedStats`.

Edge cases: no sessions → friendly empty state; ties → show earliest-dated holder, note "tied".

### Module 2 — Rivalries / Head-to-Head

For any two players, over sessions **both attended**:

- Sessions played together (count).
- **Who finished higher** tally (by `profit` in each shared session).
- **Cumulative H2H profit differential** (sum of A.profit − B.profit across shared sessions).
- **Current H2H streak** ("topped Mike 4 nights running").

Auto-surfaced (no selection needed):

- **Biggest rivalry** — the pair with the most shared sessions and closest record.
- Per player: **bogey player** (beats them most often) and **favorite victim** (they beat most).

UI: a player-A / player-B selector plus an auto-highlighted rivalry card. Ties handled explicitly.

### Module 3 — Form & Momentum board

A group-wide hot/cold board for **active** players (extends existing `getPlayerStreaks` and the
last-5-games "recent form" concept already in `statsService`):

- Recent-form indicator (wins in last N nights), trajectory arrow (up/down/flat).
- **Badges:** "on a heater" (current win streak ≥ threshold) / "in a slump" (loss streak ≥
  threshold), thresholds tuned for a low-stakes game.
- A **momentum sparkline** of each player's last N session profits.

### Module 4 — Season / Year-in-Review ("Poker Wrapped")

A periodic recap for a chosen year (and optionally a "season" = configurable date range), built on
the existing `getAggregatedStats`:

- **Champion** (highest total profit in the period), **biggest mover** (most rank positions
  gained vs prior period), **attendance king** (most sessions played), total nights, total pot.
- Fun superlatives (e.g. "most rebuys", "best single night of the season").
- Designed to be **screenshot-shareable** — clean, self-contained card layout, group name + period
  in the header.

### Module 5 — Shared "nicer graphs" layer

A consistent visual treatment applied to new charts (and available to reuse on existing ones):

- Gradient fills, smooth enter animations, richer custom tooltips, dark-mode-aware palette,
  consistent axis/legend styling — centralized as shared chart primitives/config under
  `client/src/components/insights/charts/` (or a shared `chartTheme`).
- **Two signature visualizations:**
  - **Rank-over-time bump chart** — the season "race for #1": each player's leaderboard rank
    plotted across sessions/months. High-engagement, tells the story at a glance.
  - **Momentum sparklines** — compact per-player last-N-night trend (used by Module 3).

---

## 6. Error handling & empty states

- Every endpoint returns well-formed empty/zero structures when a group has no sessions, one
  player, or no shared sessions for a pair — never an error. Frontend renders encouraging empty
  states ("Play a few more nights to unlock records").
- Tie-breaking is explicit and deterministic (earliest date wins, flagged as tied).
- Division guards: ROI/best-night metrics apply a minimum buy-in denominator to avoid noise.

---

## 7. Testing

Per the project's test setup (unit/integration/e2e) and green-before-merge rule:

- **Unit tests** for each new `StatsService` method using seed-data fixtures: records, H2H, form,
  season. Cover edge cases: zero sessions, single player, ties, players with no shared sessions,
  comeback boundary (exactly 2 rebuys).
- **Integration tests** for the four new `/stats` endpoints (happy path + empty group).
- **E2E (Playwright):** navigate to `/insights` via nav and via `G+I`, assert each module renders
  with seed data and shows a sensible empty state on an empty group.
- No changes to existing settlement/money tests are expected; if any break, that's a signal the
  change leaked into money logic and must be reverted.

---

## 8. Out of scope (future, not this spec)

- Per-player presence / time-at-table capture.
- Sharing via public links or per-player logins.
- Achievements/badges as persisted unlockables (Module 3 badges here are computed live, not stored).
- Any redesign or consolidation of the existing `/analytics` page.

---

## 9. Implementation order (single MVP, suggested build sequence)

1. Shared chart layer + theme (unblocks all visual work).
2. Module 1 (Records) — simplest data, highest delight-per-effort.
3. Module 3 (Form board) — reuses streak/recent-form logic + sparklines.
4. Module 2 (Rivalries / H2H).
5. Module 4 (Season recap) + bump chart.
6. Nav item, route, `G+I` shortcut, command-palette entry, empty states, tests throughout.

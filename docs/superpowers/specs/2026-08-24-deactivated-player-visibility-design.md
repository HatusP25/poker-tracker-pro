# Deactivated Player Visibility (F-14) — Design

**Date:** 2026-08-24
**Status:** Shipped 2026-09-07.

> **Rebuilt against the stats restructure.** This spec was written against the pre-restructure
> codebase. `Rankings.tsx`, `Analytics.tsx`, `TopPerformances.tsx` and `PlayerPerformanceChart.tsx`
> no longer exist; `statsService` was split into `statsRules`, and a new angles engine
> (`anglesService` / `anglesRules`) now feeds the rivals grid, standings story chips and player
> cards. The four decisions below were unaffected — they are product calls, not code shape.
> §5 and §6 have been rewritten to describe what actually shipped.

---

## 1. Problem

`Player.isActive` is a roster flag, not a visibility flag. Toggling a player inactive stops them
being added to *new* sessions, but they continue to appear on nearly every derived surface in the
app: they hold a rank on the leaderboard, appear in Analytics charts, own group records, show up in
season recaps, and can be the current holder of The Belt.

The root cause is architectural. Almost every computation reads `SessionEntry` rows and joins only
`player.name`; `isActive` is never selected, so the pure rule functions (`computeRecords`,
`computeHeadToHead`, `computeSeasonRecap`, `computeBeltLineage`, `computeAchievements`,
`computeRankings`) have no way to know a player has left the group.

Only three queries in the entire backend filter on the flag:

| Surface | Where |
|---|---|
| Dashboard → Player Streaks | `statsService.ts` `getPlayerStreaks` |
| Insights → Form Board | `insightsService.ts` `getForm` |
| `?activeOnly=true` query param | `playerService.getPlayersByGroup` — **no client call site passes it** |

Plus four client-side filters that gate the *roster picker* only (`EntryRow`, `LiveSessionStart`,
`LiveSessionView`, and the optional "Active only" checkbox on the Players tab).

### The Belt bug

`computeBeltLineage` only changes hands when the holder is beaten head-to-head on a night they
played. A deactivated player never plays again, so they hold the belt **permanently**. This is a
live product bug, not just a visibility gap.

---

## 2. The rule

> A deactivated player is **absent from every derived surface** — leaderboards, records, charts,
> belt, achievements, season recaps — and **fully present in every record of a night that actually
> happened**.

Everything in scope is derived on read (per [D-004](../../DECISIONS.md)), so reactivating a player
restores every surface exactly, with no migration and no persisted derived state.

---

## 3. Decisions

### D-A — Historical session records stay whole

Session detail, the entry list, settlements, pot totals, and player counts render deactivated
players exactly as they do today.

**Why:** a deactivated player's `SessionEntry` rows are load-bearing. They are part of each night's
pot, and `settlementService` validates that buy-ins equal cash-outs. Hiding those rows makes past
nights fail zero-sum validation and makes the settlement list wrong. Deactivation is an
aggregate-level concept, not a data-level one.

No visual de-emphasis: deactivated players render identically to everyone else in session records.

### D-B — Night-level totals stay whole; the roster counter goes active-only

Pot size, players-per-night, and average session size keep counting everyone who actually played.
These describe *the night*, not *the roster* — a night with six players had six players, even if one
of them left the group a year later. Filtering them would make the Dashboard report a smaller pot
than the settlement screen shows for the same evening.

`netGroupProfit` is a group-level money total and therefore also stays whole.

The Dashboard's roster counter is the exception: it currently reads "12 players / 8 active", which
surfaces deactivated players as a number. It becomes the active roster size alone.

### D-C — Deactivation is fully retroactive

Derived surfaces compute as if the player never played. Past seasons get a new champion, past belt
reigns vanish from the lineage, and their records are gone.

**Accepted cost:** a completed season's story changes retroactively. If Jordan won the 2024 season
and later leaves, the 2024 recap names a new champion. This was chosen deliberately over a
"current standings only" split, for one rule and one filter point rather than a per-surface policy
that would be hard to reason about and easy to get subtly wrong.

### D-D — The session summary modal filters ranks only

The night's own facts — highlights, night titles, player count, pot — stay whole, per D-A. The three
**cross-night** rules filter, because they quote rank positions and multi-night streaks that would
otherwise disagree with the Rankings page whenever a deactivated player sits between two active ones.

The split is by *rule*, and each filtered rule needs **both** of its inputs filtered:

| Rule | `history` | night `entries` |
|---|---|---|
| `computeRankingChanges` | filtered | filtered |
| `computeStreakUpdates` | filtered | filtered |
| `computeMilestones` | filtered | filtered |
| `computeHighlights` | — | **whole** |
| `computeNightTitles` | — | **whole** |
| `session.playerCount`, `totalPot` | — | **whole** |

Filtering only the history would be a bug, not a partial fix: all three cross-night rules iterate
the night's entry list and look each player up in the history. A deactivated player left in `entries`
would get `before.get(id) ?? 0` → a visible "rank 0, brand-new player" row, and a streak computed
from an empty history. Filtering both simply omits their rows, which is the intended behavior.

Removing a deactivated player does not perturb an active player's own numbers — streak lookback and
milestone totals are filtered to sessions where *that* player has an entry, and profits are
per-entry. Only rank positions shift, which is precisely the point.

---

## 4. Architecture

### 4.1 New module: `server/src/services/activeRoster.ts`

One pure function plus one query helper — the only impure export in the module.

```ts
export function filterRowsToActive<T extends {
  entries: { playerId: string }[];
  rebuyEvents?: { playerId: string }[];
}>(rows: T[], activeIds: ReadonlySet<string>): T[]

export async function fetchActivePlayerIds(groupId: string): Promise<Set<string>>
```

`filterRowsToActive` does three things:

1. Strips entries belonging to players outside `activeIds`.
2. Strips those players' `rebuyEvents` **in lockstep**, where the row shape has them. Without this,
   `computeAchievements` and the "most rebuys" record count phantom rebuys with no matching entry.
3. **Drops sessions left with no entries.** This is the load-bearing edge case — see §5.

The generic signature covers all three row shapes in play (`SessionRow`, `BanterSessionRow`,
`SummarySessionRow`) without any of them needing to change.

### 4.2 Where it is applied

Services call it between data access and computation. Every existing `compute*` function keeps its
current signature, and every existing unit test keeps passing unchanged.

```
fetchSessionRows(groupId)
  ↓
filterRowsToActive(rows, activeIds)   ← new, pure, unit-tested
  ↓
computeRecords(rows)                  ← unchanged
```

This was chosen over threading an `activePlayerIds` parameter into all eight rule functions (which
would churn every signature, call site, and test file for one boolean) and over adding
`where: { player: { isActive: true } }` to each Prisma query (which would put the behavior outside
the pure-function layer, leaving the empty-session drop untestable without a DB — against
[CLAUDE.md](../../../CLAUDE.md) §6).

---

## 5. The empty-session edge case

A night where *only* deactivated players played filters down to an empty session, and two surfaces
care about that in opposite directions.

**The belt must drop it.** `computeBeltLineage` increments `current.nightsHeld` *before* checking
whether anyone played, so an emptied night would hand the current champion a free reign defence for
an evening that no longer exists in the filtered view. `filterRowsToActive` drops emptied rows by
default.

**The angles engine must keep it.** `ordered.length` is the denominator for every attendance rate,
and per D-B a night that happened still counts. So the angles pass uses `dropEmpty: false` and the
row survives with an empty entry list. "Alice played 8 of 10 nights" stays true even when one of
those ten was a night only departed players attended.

*(An earlier draft of this spec also flagged an unguarded `reduce` on the Dashboard's recent-night
winner. The stats restructure fixed that independently — `computeDashboardStats` now folds with an
explicit `null` seed. Nothing to do.)*

## 6. Surface-by-surface changes

### Server

| Location | Change |
|---|---|
| `insightsService` — `getRecords`, `getHeadToHead`, both season recaps | Apply `filterRowsToActive` |
| `insightsService` — `getForm` | Already filtered the roster; now filters the rows too |
| `banterService` — `getBelt`, `getAchievements` | Apply the filter (entries **and** `rebuyEvents`) |
| `anglesService` — `getGroupAngles` | Roster query gains `isActive: true`, rows filtered with `dropEmpty: false`. This one call covers the rivals grid, the co-attendance matrix, standings story chips and player cards, because they all read the same payload. Filtering the rows also stops `computeGroupAngles` resurrecting departed players from `namesFromHistory` |
| `statsService` — `getLeaderboard` | `where: { groupId, isActive: true }` |
| `statsService` / `statsRules` — dashboard | `DashboardInput` gains optional `activePlayerIds`; the recent-night winner is picked from active players only. `playerCount`, `totalPot`, `avgSessionSize` and `netGroupProfit` stay whole (D-B) |
| `sessionSummaryService` | D-D: filtered `history` **and** filtered night entries into `computeRankingChanges`, `computeStreakUpdates`, `computeMilestones`; whole entry list into `computeHighlights`, `computeNightTitles` and the header |
| `statsService` — `getPlayerStats`, `getPlayerPerformanceTrend`; `playerService` — `searchPlayers` | Unchanged. Reachable from the Players tab, which is the carve-out |
| `sessionService`, `settlementService`, `liveSessionService` | Unchanged (D-A) |

`LeaderboardEntry.isActive` and `DashboardStats.activePlayers` are **kept**. The first is still
populated by the client-side `toLeaderboardEntries` used for CSV export; the second is the counter
the Dashboard actually renders, and it was already correct.

### Client

Eleven roster call sites pass the previously-unused `activeOnly` param: `StandingsTab`, `PlayerTab`,
`Dashboard`, `useRivals`, `RivalriesModule`, `SeasonRecapModule`, `RecentUnlocks`, `BeltCard`,
`SessionForm`, `ImportDialog`, `Sessions`.

Two are deliberately left unfiltered:

- **`AppLayout`** — its roster drives the player **colour registry**. Filtering it would strip the
  assigned colour from every deactivated player, changing how they render on the historical session
  detail that D-A says must not change.
- **`Players.tsx`** — the carve-out.

`LiveSessionStart` and `LiveSessionView` already filter inline and were left alone.

Cleanups: the `inactive` badge in `StandingsTable` is dead once the roster filters, so it is removed.
`PlayerTab`'s "No longer on the active roster" note now reads the player record rather than
`angles.isActive` — a deactivated player has no angles at all, so the old check could never fire,
and the card is still reachable from the Players tab.

## 7. Testing

TDD per [CLAUDE.md](../../../CLAUDE.md) §2 rule 5 — failing test first for every rule.

**Unit — `activeRoster.test.ts` (new):** strips inactive entries; strips `rebuyEvents` in lockstep;
drops sessions emptied by the filter; leaves fully-active rows untouched (identity); handles an
empty `activeIds` set (returns no rows).

**Unit — existing rule tests:** must pass **unchanged**. That is the proof the shim approach avoided
signature churn.

**Unit — `statsService`:** `recentSessions[].winner` is `null` for a night with no active players,
rather than throwing.

**Unit — `sessionSummaryService` (D-D):** a deactivated player who played the night produces no
`rankingChanges`, `streaks`, or `milestones` row — and specifically not a rank-0 row; the same
night's `playerCount`, `totalPot`, `highlights`, and `titles` still include them; an active player's
own streak count and milestone totals are identical before and after a co-player is deactivated.

**Integration:** deactivating a player removes them from the leaderboard, records, belt lineage,
achievements, and season recap; the belt passes to the most recent active winner; the session they
played still balances and still lists them; reactivating restores every surface to its prior state.

**E2E:** deactivate a player on the Players tab → they disappear from Rankings and Insights, and the
session they played still shows them and still balances.

**Full suite** (§5 of CLAUDE.md) green before merge.

---

## 8. Out of scope

- **`netGroupProfit` is always ≈ $0** by zero-sum construction, so it is a near-meaningless headline
  stat. Pre-existing wart, unrelated to deactivation. Track as a follow-up rather than redesigning
  the Dashboard tile here.
- **Deleting** players (as opposed to deactivating) — unchanged; still blocked when they have
  session entries.
- Any schema change. This feature is purely derived-on-read, consistent with D-004.

---

## 9. Docs to update on ship

- `CHANGELOG.md` — one entry
- `docs/WORKLOG.md` — files touched + verification
- `docs/DECISIONS.md` — new **D-006** recording D-A through D-D above
- `BACKLOG.md` — remove/move the item
- `DOCS.md` — leaderboard and dashboard stat definitions, `LeaderboardEntry` / `DashboardStats` shape changes
- `docs/follow-ups/` — one file for the `netGroupProfit` wart

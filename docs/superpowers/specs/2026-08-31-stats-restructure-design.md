# Stats & Charts Restructure — Design

**Date:** 2026-08-31
**Status:** Approved (direction confirmed with the user 2026-08-31)
**Supersedes in part:** D-003 (the `/analytics` ÷ `/insights` split) — see §9.

---

## 1. Problem

The app's numbers are correct and the *content* of its statistics is largely complete. The
problem is that the stats layer gives too little back to the people using it, and looks
unfinished while doing it.

Four concrete failures, all evidenced in the audit (§10):

1. **Stats only reward the winner.** Every headline metric — balance, leaderboard rank,
   biggest win, champion — is a superlative that exactly one person owns. A player who is
   down $60 across 20 nights opens the app and finds nothing that is about *them*.
2. **Four pages tell the same story four times.** Dashboard, Analytics, Rankings and
   Insights overlap heavily: four different "biggest win" cards with three different
   definitions, three cumulative-profit charts, five streak displays, three recent-session
   lists. Analytics is a worse Rankings; Dashboard is a worse Analytics.
3. **A large seam of stored data is never surfaced.** Day of week, table size, venue effect
   on *profit*, attendance and cadence, rebuy dollars, co-attendance, early departures,
   nemesis/favourite-victim — all derivable today with no schema change. Two of these
   (`bogey`, `favoriteVictim`) are already computed, shipped over the wire, and rendered
   nowhere.
4. **The presentation is flat.** `--card` and `--background` are the *same colour*
   (`#020817`), so every card in the app is invisible except for a 1px hairline. There is no
   type scale above 30px, no semantic profit/loss token (six different hexes mean "up" or
   "down"), no shared chart theme (3 of 9 charts use `chartTheme.ts`; the rest hardcode the
   identical hexes inline), no stat-tile primitive (the same markup is copy-pasted 15×), and
   no navigation at all below 768px.

## 2. Thesis

**Every player has a story.**

The redesign's organising principle is that each member of the group should be able to open
the app and find a true, specific, quotable sentence about themselves — whether they are up,
down, or absent. Winning is one story. So are: the longest drought, the best comeback, the
nemesis who owns you, the venue where you always lose, the night you were the ATM, the fact
that you have not missed a Friday since October.

This is what "not giving enough value to everyone" means, and it is the filter for every
decision below.

## 3. Non-goals

Bound by `docs/DECISIONS.md`:

- **No grinder/bankroll metrics** — no $/hour, no variance, no std-dev, no EV, no
  Sharpe-style efficiency. (D-002.) Existing grinder-flavoured metrics (ROI, cash-out rate,
  avg buy-in, rebuy *rate*) are **demoted, not deleted** — API fields stay for compatibility,
  but they leave the primary surfaces.
- **No cross-session debt ledger.** (D-001.) Per-night settlement colour is fine; "who owes
  whom over time" is not.
- **No schema changes.** Everything new is derived on read from existing rows. (D-004.)
- **No second charting library.** Recharts stays; bespoke marks are hand-written SVG.
- **No light theme.** Dark-only remains. Dead light-mode code gets removed, not revived.

## 4. Information architecture

Four stats surfaces collapse to two, plus a genuine home screen.

| Route | Was | Becomes |
|---|---|---|
| `/` | Dashboard (a worse Analytics) | **Home / The Pulse** — last night, the belt, who's hot, *your* headline |
| `/stats` | — | **Stats hub**, tabbed |
| `/stats/standings` | `/rankings` | Leaderboard, redesigned |
| `/stats/trends` | `/analytics` | The charts — fewer, bigger, each answering one question |
| `/stats/rivals` | (buried in Insights) | Full head-to-head matrix + pair detail |
| `/stats/player/:id` | `/players/:id` | **The player card** — the per-player story page |
| `/insights` | `/insights` | **The Story** — records, belt, form, wrapped (tightened) |
| `/players` | `/players` | Roster management only (not a stats surface) |

`/rankings`, `/analytics` and `/players/:id` become redirects, so existing links and e2e
deep-links keep working.

**Why a hub rather than four pages:** the overlap is not cosmetic. "Where do I find X?" has
no answer today because X is in three places with three definitions. Tabs make the
leaderboard, the charts and the head-to-head grid one thing you scan, not three pages you
hunt through.

## 5. Foundation — the design system

Nothing else works until this lands. This is the first wave and everything depends on it.

**5.1 Surface elevation.** `--card` is lifted off `--background`. Ground moves to the
share-card palette's instinct (`#0B1220`, a blue-lifted near-black) with `--surface-1/2/3`
and a shadow scale tuned for a dark ground. Cards become objects, not outlines.

**5.2 Semantic colour.** `--profit` / `--loss` / `--neutral` plus tint variants, single-
sourced and consumed by DOM *and* charts. Three-way like `shareCard.ts:54` — an exact `$0.00`
is neutral, not green. Resolves the six-hexes-for-one-concept problem, and de-conflicts
"profit green" from `--primary` green.

**5.3 Type scale.** Display tier added above the current 30px ceiling (hero numerals at
48/60/72), a proper label/caption tier, and `tabular-nums` on every money and count figure —
currently used exactly once in the entire client, which is why table columns visibly jitter.

**5.4 Player identity.** A stable colour per player, derived from player *id* (not array
index, which reassigns colours when the roster changes), used consistently across every
chart, chip, avatar and timeline. A `PlayerChip` primitive carries name + colour + nickname
policy in one place.

**5.5 Chart system.** `chartTheme.ts` is promoted from a 10-line constant to the chart layer:
driven by CSS custom properties, with one `ChartFrame`, one `ChartTooltip`, a height scale,
shared margins, a series cap with an "others" bucket, and a perceptually-spaced categorical
scale that does not collide with the semantic pair.

**5.6 Primitives.** `StatTile`, `PlayerChip`, `DeltaChip`, `EmptyState`, `Meter`, plus Radix
`Tabs` and `Tooltip`. Replaces 15× copy-pasted tile markup, 6 duplicated `CustomTooltip`s and
5 improvised empty states.

**5.7 Motion.** `tailwindcss-animate` is installed (build-time only, zero runtime bytes) —
this also fixes a live defect: every `animate-in` / `zoom-in-95` / `slide-in-*` class in
`dialog.tsx`, `alert-dialog.tsx` and `select.tsx` currently generates no CSS, so dialogs pop
with no transition. Then an enter/stagger vocabulary and count-up for hero numerals.

**5.8 Money formatting.** One currency-aware formatter fed by `group.currency`. Today every
stats surface hardcodes `$` while Settings lets you choose EUR.

**5.9 Mobile navigation.** `NavBar` is `hidden md:flex` with no fallback, so below 768px the
app has no navigation whatsoever and every page is a dead end. A bottom tab bar / sheet is
added. Desktop-first per the user's call, but this is a correctness floor, not polish.

## 6. New metrics — the untapped seam

All derived on read from existing rows. No schema change. Each is chosen because it produces
a sentence a specific person wants to repeat.

| Metric | Source | The sentence it produces |
|---|---|---|
| **Nemesis / favourite victim** | already computed, never rendered | "Dan has beaten you 7 of the last 9." |
| **Attendance rate + streak** | session ÷ entry counts | "You haven't missed a night since October." |
| **Longest drought** | session ordering | "Hasn't won since February." |
| **Day-of-week effect** | `Session.date` (UTC-anchored) | "You're a Friday player." |
| **Venue effect on profit** | `Session.location` × entry profit | "Everyone loses money at Sam's." |
| **Table-size effect** | `entries.length` | "You win short-handed." |
| **Rebuy dollars** | `Σ RebuyEvent.amount` (already computed internally, never exposed) | "You've put $340 back on the table." |
| **Co-attendance** | the pair matrix that is already built and then discarded | "You've played 31 nights with Muel." |
| **Early departures** | `SessionEntry.cashedOutAt` | "You leave early and it costs you." |
| **Best-night ranking** | `bestSession` in context | "That was your 3rd-best night ever." |

These feed a **player-story selector**: per player, compute every candidate angle, score them
for specificity and recency, and surface the best few. That selector is the mechanism by which
"every player has a story" becomes literal rather than aspirational.

## 7. Charts — fewer, bigger, each with a job

Today: nine charts, all 300–360px, all in identical cards, none ever the hero. A 9-line Money
Race gets exactly the same space as a 3-bar location chart.

The rule going forward: **a chart earns its place by answering one question.** Charts are
sized by importance, not uniformly. Retained and promoted: the Money Race and the Race for #1
(both genuinely narrative). Rebuilt: venue and session-size charts, to plot *profit* rather
than average pot — `ProfitByLocationChart` currently does not chart profit despite its name.
Cut: the dual-axis session-size chart, the three-bar session breakdown that restates a line of
text one screen above it. Added: the head-to-head matrix, which is one screen and instantly
starts arguments.

## 8. Correctness fixes carried along

The audit surfaced real defects in the stats path. They are in scope because a redesign that
preserves them is not worth shipping:

- **In-progress sessions pollute every stat.** No `status === 'COMPLETED'` filter exists in
  `statsService`, `insightsService`, `sessionSummaryService`, or any client-computed chart.
  A live session has `cashOut = 0`, so everyone at the table currently shows as a total loss
  in the leaderboard, records, form, season recap and every chart.
- **"Last 5 games" is not ordered.** `recentFormWinRate` slices an array fetched with no
  `orderBy`, so recent form is whatever order Postgres returned.
- `getDashboardStats` calls `.reduce()` with no initial value — a session with zero entries
  throws.
- `SessionDetail.tsx:98` hardcodes a $5 buy-in for rebuy math, ignoring `group.defaultBuyIn`,
  and yields fractional rebuys. The server fixed this exact bug in F-07; the client did not.
- `PlayerDetail` divides by `totalGames` with no zero guard → `NaN%`.
- `Analytics` seeds `biggestWin` at 0, so an all-losses range renders "+$0.00"; and keys
  participation by player *name*, so duplicates merge.
- Two components call `.sort()` on the TanStack Query cache array in place.
- `PlayerComparisonChart` ignores the page's own date filter.
- Rankings' client-side sort desynchronises from the server-supplied `rank` column.

`statsService` is also the untested flank — 7 tests covering one date helper, with the
leaderboard/dashboard/player-stats formulas verified only indirectly. Its inline math is
extracted into exported pure functions with tests, following the `insightsService`
fetch-then-delegate pattern the rest of the codebase already uses.

## 9. Decision to record

Consolidating `/analytics` and `/rankings` into a `/stats` hub narrows D-003, which
established analytics-as-toolbox and insights-as-story as separate areas. The split's
*intent* survives — Insights remains the story feed and does not absorb the charts — but the
toolbox stops being its own page. This needs a new entry in `docs/DECISIONS.md`.

## 10. Evidence

Four parallel audits against the worktree, plus full-page screenshots of every stats surface
at 1440px and 390px captured before any change:

- Frontend surface inventory — 120 rendered metrics, 11 charts, 12 correctness defects.
- Backend data audit — schema, every computed formula, the untapped-data inventory,
  performance profile, and the full test surface.
- Design system audit — exact tokens, the `--card` = `--background` finding, the missing
  `tailwindcss-animate` defect, bundle constraints.
- Product context audit — every decision on record, hard NOs, doc obligations, risk list.

## 11. Verification

The full suite must be green before any merge (`CLAUDE.md` §5). Baseline captured before work
started: **server unit 262 ✓ · client unit 106 ✓ · client tsc ✓**. E2E specs assert on the
current UI and will need updating as surfaces change — that is part of "green", not extra.

Visual verification is by before/after screenshots of every surface at both widths, driven
through the real app against real data.

# Changelog

High-level record of what shipped, newest first. Continuous deployment (push to `main` → Railway
prod), so entries are dated rather than versioned. Add an entry whenever something ships.

> For **engineering detail** (files touched, verification output) of each change, see the detailed
> log at [docs/WORKLOG.md](docs/WORKLOG.md). This file is the summary view of the same events.

---

## [Unreleased]

### 2026-08-02 — Wave 2: one definition of a rebuy (F-07)

**The Banter Pack's brags were wrong for half the group's history.** `RebuyEvent` rows were only
ever written by the live-session path, so a night typed in by hand had none — and ATM, Houdini,
Phoenix, Rebuy Royalty, "most rebuys" and "biggest comeback" all count those rows. A group that
logs some nights live and enters others afterwards got awards silently biased toward the
live-tracked nights. Separately, four different formulas for "rebuys" coexisted, and
`PlayerStats.totalRebuys` summed *fractional* rebuys — three $7 buy-ins at a $5 default reported
"1.2 rebuys".

- **`RebuyEvent` is now the single source of truth.** `statsService`, `sessionService`,
  `sessionSummaryService` and the live view all count rows. `calculateRebuys` is retired from
  production paths.
- **Hand-entered sessions get the rebuys their totals imply.** The excess over one standard buy-in
  is split into full-size rebuys plus a remainder — $17 at a $5 default becomes `[5, 5, 2]` — and
  the amounts always sum back to the recorded total, so a reconstruction can never disagree with
  the money.
- **Reconstructed rows are labelled.** New `RebuyEvent.derived` distinguishes a reconstruction from
  an observed live rebuy. Only derived rows are ever rewritten, so editing a completed live session
  can't destroy real, timestamped history.
- **Backfill script** (`server/scripts/backfill-rebuy-events.ts`) for existing sessions: dry-run by
  default, idempotent, reversible with `--undo`, refuses to run unless `--expect <db>` matches the
  connection string, and only ever *inserts* `rebuy_events` rows — no `SessionEntry`, `Session` or
  money field is read or written. **Not run against production**; that's an operator action after a
  verified backup.

### Tests
- +24 server unit (152 → 176), +12 integration (92 → 104).

### 2026-07-30 — Wave 1: the live night

Everything shipped in the previous two waves happened *after* the game. This wave is the screen
used with people actually at the table. Plan:
`docs/superpowers/plans/2026-07-30-wave-1-live-night.md`.

- **Early cash-out (F-04).** People leave home games early, constantly, and the app had no concept
  of it — the departing player's stack had to be remembered in someone's head until the final
  cash-out. You can now cash a player out mid-session: their result is recorded and locked, they
  stay visible in standings, and End Session stops asking for a number it already has. Undoable
  while the session is live. Rebuys are refused for a cashed-out player. The last player at the
  table can't leave early — that's End Session, the only path that computes settlements. Additive
  nullable `SessionEntry.cashedOutAt`; no existing row is touched.
- **Reconciliation helper (F-05).** Chip counts never match to the cent, so the zero-sum error was
  a routine end-of-night event handled as a form error the user resolved by nudging an arbitrary
  number until the app relented. End Session now shows the difference and offers to split it across
  the table or pin it on whoever miscounted. Cent-exact, refuses rather than clamping when someone
  would go below zero, and **the server's zero-sum validator is untouched and still authoritative**.
  Also fixed: the dialog previously allowed a 1% tolerance the server would reject, so a big pot
  could pass the client check and fail the request.
- **Phone-first live session (F-06).** The live view was a desktop data table. Standings are now
  cards, the Rebuy / Add Player / End Session actions stick to the bottom of the viewport under a
  thumb, every money field raises the numeric keypad, and the End Session dialog no longer
  overflows a phone screen. One layout for both phone and desktop.

### Tests
- +19 server unit (133 → 152), +18 integration (74 → 92), +18 client unit (54 → 72),
  +5 E2E (11 → 16, including a 390px-viewport pass over the whole live flow).

### 2026-07-30 — Wave 0: data safety

Found by a full codebase analysis (`docs/ai-audit/2026-07-30-codebase-analysis.md`): the app
shipped two ways to destroy the history it exists to protect. Both are closed. Plan:
`docs/superpowers/plans/2026-07-30-wave-0-data-safety.md`.

- **Backups are no longer lossy (F-01).** v1 exported only groups/players/sessions/entries, so an
  export → replace-restore round trip permanently destroyed every rebuy event, player note and
  template, threw away each session's status/settlements/completedAt, and dropped `deletedAt` —
  silently resurrecting soft-deleted sessions into the live statistics. **Format v2** covers all
  seven models and every session lifecycle field. A round-trip integration test asserts a restored
  group matches the original exactly.
- **`Replace` restore is scoped and fenced (F-02).** It ran `deleteMany({})` — wiping *every*
  group in the database regardless of what the backup file contained. It now deletes only within
  the groups the file covers; other groups are provably untouched. It is refused for v1 files
  (which cannot restore what the delete removes) and for files naming no groups. New
  `GET /backup/export/:groupId` produces a single-group backup. The UI now opens a dialog listing
  the exact groups that will be deleted and requires the group name to be typed back.
- **Mutating endpoints are gated (F-03).** The app auto-deploys to a public domain with no
  server-side authorization, and CORS constrains browsers but not `curl` — so
  `POST /api/backup/import` with `mode: "replace"` was an unauthenticated remote wipe. `X-Api-Key`
  is now required on `POST`/`PATCH`/`PUT`/`DELETE` when `API_KEY` is set; reads stay open and the
  gate is a no-op when unset, so dev and CI are unchanged. **Not** the auth epic: no `User` model,
  no login. See `docs/SECURITY.md` for the mandatory two-step rollout.

### Tests
- +39 server unit (94 → 133), +23 integration (51 → 74), +11 client unit (43 → 54), +2 E2E (9 → 11).

### 2026-07-12 — Chart truth & polish

- **The Money Race** — Analytics' "Profit Over Time" summed profit across all players per
  session, which is always ~$0 in a zero-sum game (it was plotting data-entry drift).
  Replaced with the chart a poker group actually wants: cumulative profit per player over
  the selected date range, one line per friend.
- **Player Comparison** now shows all players (top-5 cutoff removed).
- **Belt timeline** — proportional reign bands per holder inside the Belt card.
- Removed four dead chart components (DayOfWeek, Sessions, WinRateDistribution,
  dashboard ProfitTrend). Net −156 lines.

### 2026-07-12 — The Banter Pack

Bragging-rights features, all **derived-on-read from existing history — no schema changes,
no writes to session data** (design: `docs/superpowers/specs/2026-07-12-banter-pack-design.md`).

- **The Belt 🥇** — championship belt with full retroactive lineage. Succession rule
  (group-ratified): the belt is only at stake when the holder plays; whoever out-profits
  them that night takes it. Belt card + expandable lineage on Insights.
- **Night Titles** — Shark of the Night, Donation of the Night, ATM, Houdini — auto-crowned
  per session, shown on the settlement screen and session detail.
- **Achievements & Trophy Case** — 10 stake-agnostic badges (Hat Trick, Comeback Kid,
  Phoenix, Giant Slayer, Iron Man, Regular, Veteran, Rebuy Royalty, Double-Up, Untouchable),
  retroactive over the whole year; trophy case on player pages, recent unlocks on Insights,
  one-time unlock toasts (localStorage-tracked, no server state).
- **Copy for WhatsApp** — one-tap formatted night summary (results, titles, transfers,
  belt line) from the settlement screen and session detail.
- Tests: +37 server unit, +6 integration, +14 client unit, +3 e2e.

In the working tree, verified green, awaiting review/commit (2026-07-12):

### Added
- **Leaderboard timeframes** — Rankings can now be filtered to All Time / This Year / This Month /
  This Week (`?timeframe=` on the leaderboard endpoint). Metric formulas unchanged; default stays all-time.
- **Edit/undo rebuy in live session** (PH-16/IMP-008) — inline edit and delete (with confirmation)
  for rebuys during a live session, with atomic buy-in recalculation. EDITOR-only.
- **Settlement paid tracking** (BACKLOG P1) — mark each settlement transfer paid/pending within a
  night ("N of M settled"), in the post-game settlement view and a new Settlement card on session
  detail. Per-session only (DECISIONS D-001); stored in the existing settlements JSON, no migration.

### Fixed
- **Reopen-window timestamp** (PH-10) — sessions now record `completedAt` (additive migration);
  editing a completed session no longer silently re-extends its 24h reopen window.
- **Role-gating consistency** — live-session Add Rebuy / Add Player / End Session actions are now
  hidden for VIEWER, matching the rest of the app.

### Added (second batch, 2026-07-12)
- **Template quick-start** — load a saved template on the live-session start page to prefill
  lineup/location/time in one tap (inactive/removed players skipped with a warning); save the
  current setup as a template from the same page.
- **Player notes & tags** (PH-14/IMP-003) — full CRUD API for the previously-orphaned `PlayerNote`
  model plus a Notes card on player detail: banter/reads with tag chips, EDITOR-only editing.
- **Pot by location chart** (PH-15/IMP-001) — average pot per session by location on Analytics,
  client-side aggregation respecting the page's date-range filter.

### Performance
- **Client code-splitting** (P1 follow-up) — route-level `React.lazy` + vendor `manualChunks`;
  initial chunk ~1,118 kB → ~170 kB (gzip ~54 kB), Recharts loads only on chart routes, Vite
  >500 kB warning gone.

### Tests
- +17 server unit tests (57 total), +28 integration tests (45 total), +5 client unit tests
  (21 total). Full suite green including E2E against the code-split production artifact.

---

## 2026-06-19 — Insights: The Story of Your Game

A new narrative-first **Insights** area (`/insights`, shortcut `G+I`), separate from the
Analytics toolbox. All read-only and derived from existing data — **no schema changes**, nothing
touches money/settlement logic.

### Added
- **Hall of Fame & Records** — biggest win/loss/comeback, longest win/loss streaks, most rebuys in
  a night, best ROI night, biggest pot; each links to its session.
- **Rivalries / Head-to-Head** — pairwise record, profit differential, current streak; auto-surfaced
  biggest rivalry plus per-player bogey / favorite victim.
- **Form & Momentum board** — hot/cold trajectory, heater/slump badges, momentum sparklines.
- **Season Recap ("Poker Wrapped")** — champion, biggest mover, attendance king, best single night,
  most rebuys for a chosen year.
- **Shared chart layer** — chart theme, momentum sparklines, and a rank-over-time "Race for #1"
  bump chart.
- Four `/stats` endpoints: `/groups/:id/records`, `/head-to-head`, `/form`, `/season`.
- Nav item, `G+I` keyboard shortcut, and command-palette entry.

### Tests
- Unit (`insightsService.test.ts`), integration (4 endpoints), and E2E (`insights.spec.ts`).

### Docs
- Design spec + implementation plan under `docs/superpowers/`. DOCS.md and README updated.

---

## 2026-06-16 — Money-input guardrails (PH-17)

### Added / Fixed
- Block nonsensical buy-in / cash-out amounts at data entry (negative values blocked, explained,
  and clamped on blur) across live and completed-session forms. E2E coverage in
  `money-guardrails.spec.ts`. Design spec at
  `docs/superpowers/specs/2026-06-16-money-input-guardrails-design.md`.

---

## Earlier — Production hardening (PH-01…PH-13)

Pre-changelog work, reconstructed from git history. Established the current production baseline:

- **Money-logic correctness:** fixed settlement bugs; added Vitest harness; zero-sum validation.
- **Live session robustness:** input validation + atomic session-end (PH-04/05/06).
- **API security:** CORS allow-list, helmet, rate limiting (PH-07/08/09).
- **E2E + CI:** Playwright against the production artifact; GitHub Actions pipeline running
  typecheck + unit + integration + E2E on every PR and push to `main` (PH-11/12/13).
- **Live session UX:** End Session / Force End flows, auto-open end dialog via `?autoEnd=true`.

Baseline feature set (v2.0.0): groups, players, sessions (historical + live with rebuys and
mid-game joins), transaction-minimizing settlement calculator, session-summary analytics,
leaderboard/ROI/win-rate stats, 7 Analytics charts, CSV import/export, soft delete (30-day),
VIEWER/EDITOR roles, command palette + vim-style shortcuts. Full detail in [DOCS.md](DOCS.md).

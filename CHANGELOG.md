# Changelog

High-level record of what shipped, newest first. Continuous deployment (push to `main` → Railway
prod), so entries are dated rather than versioned. Add an entry whenever something ships.

> For **engineering detail** (files touched, verification output) of each change, see the detailed
> log at [docs/WORKLOG.md](docs/WORKLOG.md). This file is the summary view of the same events.

---

## [Unreleased]

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

# Changelog

High-level record of what shipped, newest first. Continuous deployment (push to `main` → Railway
prod), so entries are dated rather than versioned. Add an entry whenever something ships.

> For **engineering detail** (files touched, verification output) of each change, see the detailed
> log at [docs/WORKLOG.md](docs/WORKLOG.md). This file is the summary view of the same events.

---

## [Unreleased]

Nothing in flight. See [BACKLOG.md](BACKLOG.md) for what's next.

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

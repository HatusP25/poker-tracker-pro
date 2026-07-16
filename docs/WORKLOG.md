# Worklog

Running log of changes made to Poker Tracker Pro during the production-hardening engagement.
Newest entries at the top. Backlog: [BACKLOG.md](./BACKLOG.md). Review:
[REVIEW-2026-06-12.md](./REVIEW-2026-06-12.md).

Each entry records: what changed, why, the backlog item, and the verification that it is green.

Live backlog is now [/BACKLOG.md](../BACKLOG.md); high-level summary log is [/CHANGELOG.md](../CHANGELOG.md).

---

## 2026-07-12 (batch 4) — Chart truth & polish

**Why** Chart audit (user-requested) found Analytics' flagship "Profit Over Time" chart
summed profit across all players per session — zero-sum, so it plotted ~$0 ± entry drift
labeled as "cumulative profit". Also: top-5 cutoff on Player Comparison, four dead chart
components, and no cumulative-$-per-player chart (the one poker groups actually want).
Spec: `docs/superpowers/specs/2026-07-12-chart-truth-polish-design.md`. Client-only.

**Changed** `MoneyRaceChart.tsx` (replaces `ProfitChart.tsx` in the same Analytics slot,
inherits date-range filter) with pure TDD'd `lib/moneyRace.ts` (5 tests: carry-forward
through skipped sessions, mid-range joiners, date/createdAt sort); `PlayerComparisonChart`
shows all players; `BeltTimeline.tsx` inside `BeltCard` with pure `lib/beltSegments.ts`
(3 tests); deleted `DayOfWeekChart`, `SessionsChart`, `WinRateDistributionChart`,
`dashboard/ProfitTrendChart` (grep-verified unreferenced).

**Verification** client unit 43 ✓ · client tsc ✓ · build ✓ · server suites unaffected ✓ ·
E2E 9 ✓ on merged result.

---

## 2026-07-12 (batch 3) — The Banter Pack

**Why** PM-driven feature wave: pure bragging-rights value for the group. Spec + plan under
`docs/superpowers/` (belt succession rule chosen by the user: head-to-head). Hard constraint
honored by construction: **zero schema changes, zero writes to historical data** — everything
is computed on read (D-004 precedent), so corrected history always re-derives correctly.

**Changed**
- `server/src/services/banterService.ts(+37-test)` — pure `computeBeltLineage`,
  `computeNightTitles`, `computeAchievements`; fetch-and-delegate `getBelt`/`getAchievements`;
  types in `server/src/types/banter.ts` mirrored client-side. Endpoints
  `GET /stats/groups/:groupId/belt` and `/achievements`; `titles` added to the session summary
  (`sessionSummaryService.ts`). Integration: `tests/integration/banter.test.ts` (6).
- Client: `BeltCard` + `RecentUnlocks` on Insights, `TrophyCase` on PlayerDetail with
  localStorage one-time unlock toasts, `NightTitleChips` + Copy-for-WhatsApp on
  SettlementView/SessionDetail; pure TDD'd `nightMessage.ts` (8 tests) + `beltLine.ts`
  (6 tests); `useBelt`/`useAchievements` hooks.
- E2E `e2e/banter.spec.ts` (3): belt card with champion, trophy case (unlock toast observed
  live during the test), WhatsApp button.

**Verification** server unit 94 ✓ · integration 51 ✓ · typechecks ✓ · client unit 35 ✓ ·
E2E 9 ✓ (production artifact) · build ✓.

---

## 2026-07-12 (batch 2) — Template quick-start, player notes, location chart, code-splitting

**Why** Continue closing backlog items after the correctness batch below. All P1/P2 feature items
now shipped except the photo gallery (blocked on an upload mechanism).
**Uncommitted by request** — left in the working tree for review alongside batch 1.

**Changed**
- **Template quick-start (P2)** — `LiveSessionStart.tsx` now embeds `TemplateSelector` (prefills
  active players at group default buy-in, location, start time; skipped inactive/deleted players
  surfaced via toast) and `SaveTemplateDialog` wired to `useCreateTemplate`.
- **Player notes & tags (PH-14/IMP-003)** — `PlayerNote` model had no API/UI. Added
  `GET/POST /players/:playerId/notes`, `PATCH/DELETE /players/notes/:noteId` (service validation:
  trimmed non-empty content; tags stored as JSON string per the `photoUrls` convention). New
  `usePlayerNotes.ts` hooks, `PlayerNotes.tsx` card on `PlayerDetail` (tag Badge chips, inline
  edit/delete EDITOR-only), new shadcn `textarea.tsx`. TDD: 12 integration tests written failing-first.
- **Pot by location chart (PH-15/IMP-001)** — pure `aggregateProfitByLocation()` in
  `client/src/lib/locationStats.ts` (+5 unit tests; case-insensitive grouping, "Unspecified" bucket),
  `ProfitByLocationChart.tsx` following `DayOfWeekChart`'s pattern, placed on `Analytics.tsx` and
  inheriting its date-range filter. Note: `DayOfWeekChart` itself was deliberately removed from
  Analytics in commit 36f82b7; left that decision intact.
- **Client code-splitting (P1, follow-up 2026-06-19)** — route-level `React.lazy`/`Suspense` in
  `App.tsx` (shell/providers eager, 13 route pages lazy, new `RouteLoader.tsx` fallback) + vendor
  `manualChunks` in `vite.config.ts` (react/router/query/recharts/ui). Initial chunk 1,118 kB →
  169.6 kB (gzip 53.7 kB); Recharts (404 kB) loads only on chart routes; >500 kB warning gone.

**Verification** server unit 57 ✓ · integration 45 ✓ · server+client typecheck ✓ · client unit 21 ✓ ·
E2E 6 ✓ (code-split production artifact) · client build ✓ (no chunk-size warning).

---

## 2026-07-12 — Leaderboard timeframes, reopen-window fix, rebuy edit/undo, settlement paid tracking

**Why** Close the remaining "ready for real weekly games" gaps: the leaderboard was all-time only,
a mis-entered rebuy couldn't be corrected mid-game, the 24h reopen window silently re-extended on
any session edit (PH-10), and settlement transfers had no paid/pending state (BACKLOG P1).
**Uncommitted by request** — left in the working tree for review; nothing committed or pushed.

**Changed**
- **Leaderboard timeframes** — `GET /groups/:groupId/leaderboard?timeframe=all|year|month|week`
  (default `all`, unchanged behavior; invalid → 400). Pure `getTimeframeStart()` helper in
  `statsService.ts` (week is Sunday-based, matching `getProfitTrend`); metric formulas untouched.
  Rankings page gained a timeframe `Select` (All Time / This Year / This Month / This Week).
- **PH-10 reopen-window fix** — additive `Session.completedAt DateTime?` column (migration
  `20260712045404_add_session_completed_at`, applied to dev/test/e2e DBs). Stamped on every
  COMPLETED transition; `reopenSession` now checks `completedAt ?? updatedAt` and clears it on reopen.
- **Rebuy edit/undo (PH-16/IMP-008)** — `PATCH`/`DELETE /live-sessions/:sessionId/rebuys/:rebuyId`;
  atomic `$transaction` updates RebuyEvent + SessionEntry.buyIn (guards amount > 0, buyIn > 0,
  IN_PROGRESS only). Inline edit/delete controls in `RebuyItinerary`, EDITOR-gated.
- **Settlement paid tracking (P1)** — optional `paid` flag inside the existing settlements JSON
  (no migration; per-session only per DECISIONS D-001). `PATCH /sessions/:sessionId/settlements/:index`
  via pure `setSettlementPaid()` helper. New shared `SettlementList` component ("N of M settled",
  EDITOR checkbox toggle) used in `SettlementView` and a new Settlement card on `SessionDetail`.
- **Role-gating consistency** — Add Rebuy / Add Player / End Session in `LiveSessionView` now
  hidden for VIEWER (pre-existing gap).

**Files** Server: `statsService.ts(+test)`, `statsController.ts`, `liveSessionService.ts`,
`liveSessionController.ts`, `sessionService.ts`, `sessionController.ts`, `settlementService.ts(+test)`,
`calculations.ts(+test)`, `routes/{stats,liveSessions,sessions}.ts`, `types/index.ts`,
`prisma/schema.prisma` + migration, `tests/integration/{leaderboardTimeframe,liveSession,sessionSettlements}.test.ts`.
Client: `Rankings.tsx`, `LiveSessionView.tsx`, `SettlementView.tsx`, `SessionDetail.tsx`,
`components/live/RebuyItinerary.tsx`, new `components/session/SettlementList.tsx`,
`hooks/{useStats,useLiveSessions,useSessions}.ts`, `lib/api.ts`, `types/index.ts`.

**Verification** server unit 57 ✓ · integration 33 ✓ · server+client typecheck ✓ · client unit 16 ✓ ·
E2E 6 ✓ (production artifact) · client build ✓.

---

## 2026-06-19 — Insights: The Story of Your Game

**Why** Find feature gaps that add real value to a *home* poker group. Chosen direction: social,
bragging-rights analytics (not grinder/bankroll metrics — see [DECISIONS.md](./DECISIONS.md) D-001/D-002).

**Changed** New read-only `/insights` area (`G+I`), separate from Analytics ([DECISIONS](./DECISIONS.md) D-003).
Four modules — Hall of Fame & Records, Rivalries/Head-to-Head, Form & Momentum, Season Recap
("Poker Wrapped") — plus a shared chart layer (theme, momentum sparklines, rank-over-time "Race for
#1" bump chart). All derived from existing data, **no schema changes**, nothing touches money/settlement
logic ([DECISIONS](./DECISIONS.md) D-004).

**Files** Backend: `server/src/services/insightsService.ts(+test)`, `server/src/types/insights.ts`,
4 controllers + routes in `statsController.ts`/`routes/stats.ts`, integration tests in
`tests/integration/api.test.ts`. Frontend: `client/src/pages/Insights.tsx`,
`client/src/components/insights/**` (4 modules + `charts/`), `client/src/hooks/useInsights.ts`,
`insightsApi` in `lib/api.ts`, mirrored types, route/nav/shortcut/palette wiring. E2E:
`e2e/insights.spec.ts`. Docs: spec + plan under `docs/superpowers/`, `DOCS.md`, `README.md`.

**Verification** server unit 40 ✓ · integration 12 ✓ · client typecheck ✓ · E2E 6 ✓ · build ✓.
Merged to `main` and deployed.

**Follow-up flagged** Client bundle ~1.1 MB / ~318 kB gzip (Vite >500 kB warning) — pre-existing,
tracked in `docs/follow-ups/2026-06-19-bundle-code-splitting.md`.

---

## 2026-06-16 — PH-17: money-input guardrails

**Why** A cash-out could be typed negative (nonsensical — floor is $0). Hardened all money
inputs at the point of entry to mirror the server's existing limits. Design:
`docs/superpowers/specs/2026-06-16-money-input-guardrails-design.md`.

**Changed**
- New `client/src/lib/moneyValidation.ts` — single source of truth for buy-in (>0, ≤1000),
  cash-out (≥0, ≤10000), rebuy (>0, ≤1000), plus `clampCashOut`. Built test-first (16 unit tests).
- Set up Vitest in `client/` (`npm test`); was previously test-free.
- Wired the helper into every money input with inline error messages + `min`/`max`, and folded
  validity into the action's disabled state:
  - `EndSessionDialog` — per-player cash-out error; **clamps negatives to 0 on blur**; End Session
    disabled while any cash-out is invalid.
  - `EntryRow` + `SessionForm` — buy-in/cash-out errors; Create Session disabled when a player row
    holds an invalid value; cash-out blur-clamp.
  - `RebuyDialog` — rebuy amount error; Add Rebuy disabled when invalid.
  - `LiveSessionStart` — buy-in entry now uses the shared rule (rejects ≤0 / over-cap).
- Playwright E2E (`e2e/money-guardrails.spec.ts`): negative cash-out shows the message, disables
  End Session, and clamps to 0 on blur; entry form blocks a negative buy-in.
- CI now also runs the client unit tests.

**Verification** server unit 27 ✓ · integration 8 ✓ · client unit 16 ✓ · E2E 4 ✓ · both builds ✓ ·
typecheck ✓.

**Files** `client/src/lib/moneyValidation.ts(+test)`, `client/vitest.config.ts`,
`client/package.json`, `client/src/components/{live/EndSessionDialog,live/RebuyDialog,sessions/EntryRow,sessions/SessionForm}.tsx`,
`client/src/pages/LiveSessionStart.tsx`, `e2e/money-guardrails.spec.ts`, `.github/workflows/ci.yml`.

---

## 2026-06-12 — PH-13: CI pipeline

**Changed**
- Added `.github/workflows/ci.yml` — on every PR and push to `main`, spins up a Postgres 16
  service, installs all three packages, generates the Prisma client, creates + migrates the test
  and e2e databases, then runs: server typecheck, client build, unit tests, integration tests,
  and Playwright E2E. Uploads the Playwright report on failure. This enforces "don't merge if
  red" (closes IMP-015).
- The test configs already honour `TEST_DATABASE_URL` / `E2E_DATABASE_URL`, so CI just points
  them at the service Postgres.

**Verification** Command chain verified locally (server `tsc --noEmit` OK, `build:client` OK,
unit 27 / integration 8 / e2e 2 all green). The workflow runs on GitHub Actions; first run will
confirm the runner wiring.

**Files** `.github/workflows/ci.yml`, `docs/BACKLOG.md`.

---

## 2026-06-12 — PH-11/12: Playwright E2E (production stack)

**Changed**
- Added Playwright E2E that runs against the **production artifact**: client built into
  `server/public`, served by the Express server in `NODE_ENV=production`, backed by a disposable
  `poker_tracker_e2e` database (reset via `psql TRUNCATE` in `e2e/global-setup.ts`, with a guard
  that refuses any non-e2e DB).
- `e2e/live-session.spec.ts` — full money flow in a real browser: start live session → add a
  rebuy (Radix select) → end with balanced cash-outs → assert the rendered settlement
  (`Alice → Bob $200.00`, zero-sum validated). Covers F-02/F-03/F-04 end to end.
- `e2e/smoke.spec.ts` — API health + SPA shell render.
- Added stable `data-testid`s: `cashout-input-<name>` (EndSessionDialog), `settlement-row`
  (SettlementView).
- Root scripts `e2e:build` / `test:e2e`; `playwright.config.ts`; gitignored build/report dirs.

**Verification** `npm run test:e2e` → 2 passed (live flow + smoke). Unit (27) and integration (8)
remain green.

**Files** `playwright.config.ts`, `e2e/*`, `package.json`, `.gitignore`,
`client/src/components/live/EndSessionDialog.tsx`, `client/src/pages/SettlementView.tsx`.

---

## 2026-06-12 — PH-07/08/09: API security hardening

**Changed**
- **F-07**: replaced `origin:'*'` + `credentials:true` with an explicit allow-list parsed from
  `CORS_ORIGIN`. Credentials are only enabled when an explicit origin list is configured; dev
  reflects the request origin without credentials.
- **F-08**: added `helmet` (CSP disabled — same-origin SPA, hand-tuned policy out of scope) and
  `express-rate-limit` (300 req/min/IP, `RATE_LIMIT_MAX` override). Health check is exempt. Body
  size capped at 1 MB. `trust proxy` set for Railway.
- **F-06 / PH-09**: documented the single-tenant trust model and the client-only-authz limitation
  in `docs/SECURITY.md`; server-side authz deferred to the auth epic (IMP-011).
- 4 supertest API tests verifying helmet headers, rate-limit headers, health exemption, and CORS.

**Verification** `npm test` → 27 passed · `npm run test:integration` → 8 passed ·
`npm run build` → clean.

**Files** `server/src/app.ts`, `server/package.json`, `server/tests/integration/api.test.ts`,
`docs/SECURITY.md`.

---

## 2026-06-12 — PH-04/05/06: live-session validation + atomic end

**Changed**
- **F-02**: `liveSessionService` now validates amounts up front and throws `ValidationError`
  (→400) on bad input — `startSession` buy-ins, `addRebuy` amount, `addPlayer` buy-in,
  `endSession` cash-outs. Previously negative/NaN values were written straight to the DB.
- **F-03/F-04**: `endSession` now computes settlements (incl. the zero-sum check) *before*
  persisting, then writes cash-outs and the `COMPLETED` flip inside a single `$transaction`. A
  non-reconciling table is rejected with no partial write; the session stays `IN_PROGRESS`.
- Added a DB-backed integration harness: `vitest.integration.config.ts` (points at
  `poker_tracker_test`, resets tables per test, refuses to run against a non-test DB) and
  `npm run test:integration`. Unit `npm test` stays DB-free.
- 4 integration tests covering the full live lifecycle, the no-partial-write guarantee, and
  input rejection.

**Verification** `npm test` → 27 passed · `npm run test:integration` → 4 passed ·
`npm run build` → clean.

**Files** `server/src/services/liveSessionService.ts`, `server/vitest.config.ts`,
`server/vitest.integration.config.ts`, `server/tests/integration/{setup,liveSession.test}.ts`,
`server/package.json`.

---

## 2026-06-12 — PH-01/02/03: test harness + settlement fixes

**Changed**
- Added Vitest harness to the server (`npm test`, `test:watch`, `test:integration`); excluded
  `*.test.ts` from the `tsc` production build.
- Added 27 unit tests covering all of `utils/calculations.ts` and `services/settlementService.ts`.
- Fixed **F-01**: `validateSettlements` is now a real reconciliation check
  `validateSettlements(balances, settlements)` (was a no-op that always returned `true`).
- Fixed **F-10** (found by the new tests): `calculateSettlements` was mutating the caller's
  creditor balance objects — now clones both debtors and creditors.
- Fixed **F-04** service-side: a non-zero-sum table now throws a typed `ValidationError`
  (→ HTTP 400) naming the exact discrepancy, instead of a generic 500.
- Added a post-condition in `calculateSessionSettlements` that asserts the computed settlements
  reconcile the balances.

**Why** These are the HIGH-RISK money paths flagged in the prior audit with zero coverage. The
harness is the prerequisite for the "don't commit unless green" rule.

**Verification** `npm test` → 27 passed. `npm run build` → clean, no test files emitted.

**Files** `server/vitest.config.ts`, `server/package.json`, `server/tsconfig.json`,
`server/src/utils/calculations.test.ts`, `server/src/services/settlementService.test.ts`,
`server/src/services/settlementService.ts`.

---

## 2026-06-12 — Engagement kickoff

- Performed full production review (see REVIEW-2026-06-12.md).
- Created triaged backlog (PH-01 … PH-16).
- Created this worklog.
- Branch: `chore/production-hardening`.
- Nothing committed yet — work begins with the test harness (PH-01) so every later change can be
  green-gated before commit.

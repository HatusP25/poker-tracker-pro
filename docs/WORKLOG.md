# Worklog

Running log of changes made to Poker Tracker Pro during the production-hardening engagement.
Newest entries at the top. Backlog: [BACKLOG.md](./BACKLOG.md). Review:
[REVIEW-2026-06-12.md](./REVIEW-2026-06-12.md).

Each entry records: what changed, why, the backlog item, and the verification that it is green.

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

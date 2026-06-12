# Worklog

Running log of changes made to Poker Tracker Pro during the production-hardening engagement.
Newest entries at the top. Backlog: [BACKLOG.md](./BACKLOG.md). Review:
[REVIEW-2026-06-12.md](./REVIEW-2026-06-12.md).

Each entry records: what changed, why, the backlog item, and the verification that it is green.

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

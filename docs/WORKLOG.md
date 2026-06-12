# Worklog

Running log of changes made to Poker Tracker Pro during the production-hardening engagement.
Newest entries at the top. Backlog: [BACKLOG.md](./BACKLOG.md). Review:
[REVIEW-2026-06-12.md](./REVIEW-2026-06-12.md).

Each entry records: what changed, why, the backlog item, and the verification that it is green.

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

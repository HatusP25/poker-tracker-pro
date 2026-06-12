# Backlog (Triaged) — Production Hardening

Source review: [REVIEW-2026-06-12.md](./REVIEW-2026-06-12.md). Change history:
[WORKLOG.md](./WORKLOG.md). Older feature backlog: `docs/ai-audit/improvement-backlog.md` (IMP-*).

Triage key — **P0**: correctness / data integrity / release blocker · **P1**: security &
robustness · **P2**: product gaps & enhancements. Within a priority, items are listed in the
order they should be tackled.

Status: ⬜ todo · 🟡 in progress · ✅ done · ⏸ deferred

---

## P0 — Correctness & data integrity

| ID | Item | Status | Notes |
|----|------|--------|-------|
| PH-01 | Stand up server test harness (Vitest) | ✅ | `npm test` → vitest. |
| PH-02 | Unit tests for money logic (calculations + settlement) | ✅ | 27 tests, green. |
| PH-03 | Fix `validateSettlements` no-op (F-01) + input-mutation bug (F-10) | ✅ | Reconciliation validator + clone both sides; zero-sum → 400 w/ discrepancy (covers F-06/F-04 service side). |
| PH-04 | Validate live-session amounts: rebuy/addPlayer/endSession (F-02) | ⬜ | Reject ≤0, NaN, over-max. |
| PH-05 | Make `endSession` transactional (F-03) | ⬜ | Wrap cash-out writes + status flip in `$transaction`. |
| PH-06 | Zero-sum mismatch → 400 with discrepancy (F-04) | ⬜ | Typed error, surfaced in UI. |

## P1 — Security & robustness

| ID | Item | Status | Notes |
|----|------|--------|-------|
| PH-07 | Fix CORS allow-list (F-07) | ⬜ | No wildcard + credentials. |
| PH-08 | Add `helmet` + `express-rate-limit` (F-08) | ⬜ | Sensible API limits. |
| PH-09 | Decision + doc on server-side authz (F-06) | ⬜ | Document single-tenant trust model; defer to auth epic. |
| PH-10 | Fix `reopenSession` window timestamp (F-09) | ⬜ | Use a dedicated completedAt or store settlement time. |

## P1 — Verification

| ID | Item | Status | Notes |
|----|------|--------|-------|
| PH-11 | Playwright E2E: completed-session → settlement flow | ⬜ | Against disposable test DB. |
| PH-12 | Playwright E2E: live session start→rebuy→end→settlement | ⬜ | Covers F-02/03/04 end-to-end. |
| PH-13 | CI workflow (typecheck + unit + E2E) | ⬜ | Enforce "don't merge if red" (IMP-015). |

## P2 — Product gaps (carried from IMP backlog)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| PH-14 | Surface player notes in PlayerDetail (IMP-003) | ⬜ | Schema exists, no UI. |
| PH-15 | Profit by location / day-of-week analytics (IMP-001/002) | ⬜ | Day-of-week chart partly present. |
| PH-16 | Undo/edit rebuy in live session (IMP-008) | ⬜ | Needs RebuyEvent edit/delete + buyIn recalc. |

---

## Change Log

| Date | Action | Items |
|------|--------|-------|
| 2026-06-12 | Created triaged backlog from production review | PH-01 … PH-16 |

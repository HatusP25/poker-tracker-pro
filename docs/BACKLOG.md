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
| PH-04 | Validate live-session amounts: rebuy/addPlayer/endSession (F-02) | ✅ | Guards in start/addRebuy/addPlayer/endSession; integration-tested. |
| PH-05 | Make `endSession` transactional (F-03) | ✅ | Cash-out writes + status flip in `$transaction`; settlement computed pre-persist. |
| PH-06 | Zero-sum mismatch → 400 with discrepancy (F-04) | ✅ | Service throws `ValidationError` (→400) before any write; no partial state. UI surfacing tracked separately if needed. |

## P1 — Security & robustness

| ID | Item | Status | Notes |
|----|------|--------|-------|
| PH-07 | Fix CORS allow-list (F-07) | ✅ | Allow-list from `CORS_ORIGIN`; credentials only with explicit origins. |
| PH-08 | Add `helmet` + `express-rate-limit` (F-08) | ✅ | helmet (CSP off), 300 req/min/IP, 1 MB body cap; API tests. |
| PH-09 | Decision + doc on server-side authz (F-06) | ✅ | `docs/SECURITY.md` — single-tenant trust model, deferred to auth epic (IMP-011). |
| PH-10 | Fix `reopenSession` window timestamp (F-09) | ⬜ | Use a dedicated completedAt or store settlement time. |

## P1 — Verification

| ID | Item | Status | Notes |
|----|------|--------|-------|
| PH-11 | Playwright E2E: production stack boot smoke | ✅ | Builds SPA, serves via prod server, API health + shell render. |
| PH-12 | Playwright E2E: live session start→rebuy→end→settlement | ✅ | Full browser flow covering F-02/03/04; settlement asserted. |
| PH-13 | CI workflow (typecheck + unit + integration + E2E) | ✅ | `.github/workflows/ci.yml` with Postgres service; runs on PRs + main. |

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

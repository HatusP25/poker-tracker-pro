# Implementation Plan — Wave 1: The Live Night (F-04 · F-05 · F-06)

Spec: [`docs/superpowers/specs/2026-07-30-feature-roadmap.md`](../specs/2026-07-30-feature-roadmap.md) (Wave 1)

**Goal.** Everything shipped in the last two waves happens *after* the game. This wave is the one
screen used with people actually at the table.

**Order matters.** F-04 and F-05 both add UI to `LiveSessionView`, so the layout rework (F-06)
comes last — otherwise it gets done twice.

**Data rule.** F-04 adds one nullable column. No existing row is read, rewritten or migrated;
`cashedOutAt IS NULL` is exactly the behaviour every existing session already has.

---

## F-04 — Early cash-out

### The gap

People leave home games early, constantly. Today the app has no concept of it: a player who quits
at 11pm has to be remembered in someone's head (or on paper) until the final cash-out — precisely
the error the app exists to prevent.

### Model

`SessionEntry.cashedOutAt DateTime?` — additive, nullable. Null means "still at the table", which
is what every existing row means today.

### Rules (pure, `server/src/services/liveSessionRules.ts`)

Extracted as pure functions over already-fetched rows, per the `insightsService` convention, so
the rules are unit-testable without a DB.

- `planEarlyCashOut(entries, playerId, cashOut)` → ok, or a reason:
  - player not in this session
  - player already cashed out
  - invalid amount (reuses `isValidCashOut`)
  - **would leave nobody at the table** — cashing out the last player is what End Session is for
- `planUndoCashOut(entries, playerId)` → ok, or: not in session / not cashed out
- `entriesAwaitingCashOut(entries)` → the rows End Session still needs numbers for

### Service + API

- `liveSessionService.cashOutPlayer(sessionId, playerId, cashOut)` — sets `cashOut` +
  `cashedOutAt` in one update. IN_PROGRESS only.
- `liveSessionService.undoCashOut(sessionId, playerId)` — clears both. IN_PROGRESS only.
- `addRebuy` / `updateRebuy` / `deleteRebuy` reject a cashed-out player: their night is closed.
- `endSession` only requires cash-outs for `entriesAwaitingCashOut`; already-settled entries keep
  their stored value and still feed the settlement math and the zero-sum check.
- `reopenSession` **keeps** early cash-outs — they are real events, not artifacts of ending.
- `POST /live-sessions/:id/cash-out` `{ playerId, cashOut }`
- `DELETE /live-sessions/:id/cash-out/:playerId`

### Client

- Per-player "Cash out" action in the live standings; cashed-out players render distinctly with
  their result and an "Undo" affordance. EDITOR-only, matching the rest of the live actions.
- `EndSessionDialog` shows already-settled players read-only and only collects the rest.

### Tests

Unit on the rule functions (every rejection branch + the boundary where one player remains).
Integration on the endpoints incl. rebuy-after-cash-out rejection and an end-to-end
early-cash-out → end-session → settlement flow. E2E on the browser flow.

---

## F-05 — Reconciliation helper

### The gap

Chip counts never match to the cent. `calculateSessionSettlements` throws a `ValidationError` when
cash-outs don't sum to buy-ins — correct, and it must stay that way — but the *workflow* is that
the user nudges an arbitrary number until the app relents, undocumented and unattributed, at
midnight while everyone waits.

### Design

**Client-side only. The server's zero-sum validator is untouched and stays authoritative.** This
only helps the user produce numbers that satisfy it.

Pure `client/src/lib/reconcile.ts`:

- `computeDiscrepancy(totalBuyIn, cashOuts)` → signed cents-accurate difference
- `splitEvenly(cashOuts, discrepancy, targetIds)` → adjusted cash-outs
- `assignToOne(cashOuts, discrepancy, playerId)` → adjusted cash-outs

Invariants pinned by tests:
- the adjusted set sums **exactly** to the buy-in total, to the cent
- remainders distribute deterministically (a 3-way split of $1.00 is 0.34 / 0.33 / 0.33, not
  0.33 × 3 leaving a cent unaccounted for)
- an adjustment that would push any cash-out below zero is **refused**, not clamped — clamping
  would silently break the exact-sum guarantee. The UI falls back to "keep editing".

`EndSessionDialog` shows the live discrepancy and offers *split evenly across the table*,
*assign to one player*, or *keep editing*.

---

## F-06 — Phone-first live session

Presentational only, no API change, done last so it is done once.

- `LiveSessionView` standings become cards, not a desktop data table
- Rebuy / Add player / Cash out / End session reachable one-handed
- `inputMode="decimal"` on every money field so phones raise the numeric keypad
- Larger tap targets on the dialogs
- Playwright mobile-viewport coverage of the live flow

---

## Verification

Full suite per CLAUDE.md §5 on the branch and again on the merged result. The migration is
additive and nullable; `prisma migrate deploy` on Railway applies it without touching existing
rows. Do not push without the user's word.

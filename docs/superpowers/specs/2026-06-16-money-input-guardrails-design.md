# Design — Money-input guardrails

**Date:** 2026-06-16
**Status:** Approved (direction delegated to implementer)
**Related:** docs/REVIEW-2026-06-12.md (F-02 server-side validation), docs/SECURITY.md

## Problem

Money inputs in the UI accept nonsensical values. The trigger: a **cash-out can be typed
negative**, which is meaningless — the floor is `$0` (you lost everything). The completed-session
entry form (`EntryRow`) has plain number inputs with no `min`/`max` and lets the form submit even
when totals don't balance. The server already rejects bad values (F-02), so this is purely a
**UX-at-point-of-entry** gap: the user gets no clear, immediate reason why a value is wrong.

## Goal

Make the UI's money rules visible and enforced at entry, mirroring the server's existing limits so
the two never disagree. A user should not be able to *submit* a nonsensical money value, and should
see *why* a field is invalid.

## Rules (mirror server `utils/validators.ts`)

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| Buy-in | > 0 | ≤ 1000 | `isValidBuyIn` |
| Cash-out | ≥ 0 | ≤ 10000 | `isValidCashOut` — 0 is valid (lost everything) |
| Rebuy amount | > 0 | ≤ 1000 | `isValidBuyIn` |

These caps already exist server-side; the UI mirrors them as a single source of truth.

## Approach (chosen)

**Validate + block submit, with a blur-clamp for negative cash-out.**

- Each money `<input>` gets `min`/`max`/`step` attributes (first line of defense).
- A shared client helper is the single source of truth for the rules and messages.
- When a field violates a rule, a small red message renders beneath it (e.g. "Cash-out can't be
  negative", "Buy-in must be greater than $0", "Max is $1,000").
- The relevant action button is **disabled** while any money field is invalid: entry-form **Save**,
  **Add Rebuy**, **End Session**, **Start Live Session**.
- **Blur-clamp:** a negative cash-out snaps to `0` on blur (unambiguous; the only auto-correction).
- The existing zero-sum check in `EndSessionDialog` / `BalanceIndicator` is unchanged — it stays a
  separate concern layered on top of per-field validity.

Rejected: hard keystroke-clamping everywhere (jumpy mid-typing, fiddly with partial decimals).
The server remains the ultimate backstop, so nothing bad reaches the DB regardless.

## Components / units

### New: `client/src/lib/moneyValidation.ts` (single source of truth, unit-tested)
```
export const MAX_BUY_IN = 1000;
export const MAX_CASH_OUT = 10000;
export interface FieldValidity { valid: boolean; message?: string }
export function validateBuyIn(value: number): FieldValidity
export function validateCashOut(value: number): FieldValidity
export function validateRebuy(value: number): FieldValidity
export function clampCashOut(value: number): number   // negatives -> 0
```
Messages are user-facing strings. NaN/undefined → invalid with a "enter an amount" message.

### New (optional, tiny): `client/src/components/ui/field-error.tsx`
A one-line `<p className="text-sm text-destructive">` wrapper for consistent inline errors. May be
inlined if it isn't worth a component.

### Modified
- **`EntryRow.tsx`** — `min`/`max` on buy-in & cash-out; inline error under each; cash-out
  blur-clamp. Compute per-field validity from the helper.
- **`SessionForm.tsx`** — derive `entriesValid` (every entry's buy-in & cash-out valid) and add it
  to the Save button's `disabled` condition. (Today Save is only disabled while pending.)
- **`RebuyDialog.tsx`** — `min`/`max` on amount; inline error; fold validity into the existing
  `disabled` on Add Rebuy.
- **`EndSessionDialog.tsx`** — `min`/`max` on each cash-out; inline per-player error; cash-out
  blur-clamp; fold per-field validity into the End Session `disabled` (alongside the zero-sum
  check).
- **`LiveSessionStart.tsx`** — surface a message when a per-player buy-in is invalid (today it
  silently ignores it); fold into the Start button `disabled`.

## Data flow

Inputs are local component state (unchanged). Validity is *derived* on each render via the helper —
no new state machine. Parent forms/dialogs aggregate child validity to decide button `disabled`.

## Testing

- **Unit (client):** set up Vitest in `client/` (mirrors server). Test `moneyValidation.ts`
  boundaries: `-1, 0, 0.01, 1000, 1000.01, 10000, 10000.01, NaN` for each rule, and `clampCashOut`.
- **E2E (Playwright):** extend coverage to assert the user-visible behavior:
  - In `EndSessionDialog`, typing a negative cash-out shows the error and **disables End Session**;
    on blur it clamps to `0`.
  - In the completed-session entry form, a negative buy-in shows the error and **disables Save**.
- All existing suites must stay green (green-before-merge rule).

## Build sequence

1. `moneyValidation.ts` + Vitest setup in client + unit tests (red → green).
2. `EntryRow` + `SessionForm` wiring + inline errors.
3. `RebuyDialog`, `EndSessionDialog`, `LiveSessionStart` wiring.
4. Extend Playwright E2E.
5. Full green gate (unit ×2, integration, e2e), then commit.

## Out of scope

- Explanatory tooltips for *legitimate* negatives (a real loss, negative ROI) — those values are
  correct; only nonsensical *input* is being prevented.
- Any server change (already enforced).
- Currency-aware formatting / i18n of the inputs.

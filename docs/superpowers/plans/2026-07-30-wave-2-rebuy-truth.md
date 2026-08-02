# Implementation Plan — Wave 2: One Definition of a Rebuy (F-07)

Spec: [`docs/superpowers/specs/2026-07-30-feature-roadmap.md`](../specs/2026-07-30-feature-roadmap.md) (F-07)
Analysis: [`docs/ai-audit/2026-07-30-codebase-analysis.md`](../../ai-audit/2026-07-30-codebase-analysis.md) §3.3, §3.4

## The problem

`RebuyEvent` rows are created **only** by `liveSessionService.addRebuy()`. A session entered by
hand (or imported from CSV, or restored from a v1 backup) has none — but the entire Banter Pack
counts rebuys by counting those rows:

| Feature | Behaviour on a hand-entered session |
|---------|-------------------------------------|
| ATM, Houdini (night titles) | never awarded |
| Phoenix, Rebuy Royalty (achievements) | never awarded |
| Records › most rebuys | always 0 |
| Records › biggest comeback (needs ≥2 rebuys) | never qualifies |

So a group that logs some nights live and enters others afterwards gets awards silently biased
toward the live-tracked nights. Nothing errors; the brags are just quietly wrong.

Separately, four different formulas for "rebuys" coexist, and `PlayerStats.totalRebuys` sums
*fractional* rebuys — a player with three $7 buy-ins at a $5 default is reported as having
"1.2 rebuys".

## The approach

Make `RebuyEvent` the single source of truth, and give hand-entered sessions the rows they were
always missing.

**Derived vs recorded.** A live rebuy is an observed event with a real timestamp. A rebuy inferred
from a hand-entered total is a reconstruction. Conflating them would mean a later edit could
silently destroy real history, so `RebuyEvent` gains `derived Boolean @default(false)` — additive,
and `false` is exactly what every existing row already means. Only derived rows are ever rewritten.

**Derivation rule** (pure, `deriveRebuyAmounts(buyIn, defaultBuyIn)`): the excess over one standard
buy-in, split into full-size rebuys plus a remainder. `$17` at a `$5` default → `[5, 5, 2]`. The
amounts always sum to `buyIn − defaultBuyIn`, so the reconstruction can never disagree with the
recorded total. This inherits the assumption `calculateRebuys` already makes — that a player's
first buy-in was the group default — which is the only thing the stored data supports.

## Tasks

### 1 — `deriveRebuyAmounts` (pure, TDD)
Cases: no excess; exact multiples; a remainder; a short buy-in (below default); a zero/negative
default (guard); float dust (`$17.10` at `$5.70`). Invariant test: the amounts always sum to the
excess, to the cent.

### 2 — Migration
`RebuyEvent.derived Boolean @default(false)`. Additive; no existing row is read or rewritten.

### 3 — Write derived events on the manual path
- `sessionService.createSession` — derive per entry, create with `derived: true`.
- `sessionService.updateSession` / `updateEntry` — when an entry's `buyIn` changes, delete that
  entry's **derived** rows and re-derive. **Never touches `derived: false` rows**, so a
  live-tracked night's real history survives any later edit.
- `liveSessionService.addRebuy` keeps writing `derived: false`.

### 4 — Read consistently
`statsService.getPlayerStats` (`totalRebuys`, `rebuyRate`), `sessionService.getSessionById`
(`entries[].rebuys`), `sessionSummaryService.calculateHighlights`, and `LiveSessionView` all count
`RebuyEvent` rows. Retire `calculateRebuys` from production paths.

### 5 — Backfill script (`server/scripts/backfill-rebuy-events.ts`)
For entries with **zero** rebuy events, add derived rows. Safety, in order:
- **dry-run by default**; writes only with `--apply`
- prints a full per-session report before and after
- **idempotent** — an entry that already has any rebuy event is skipped, so a second run is a no-op
- **reversible** — `--undo` deletes only `derived: true` rows
- refuses to run against a database whose URL doesn't match `--expect <substring>`
- never modifies `SessionEntry`, `Session`, or any money field; it only inserts `RebuyEvent` rows

**This script is not run against production by me.** It ships tested against the test database;
running it against prod is the user's action, after a verified backup.

### 6 — Docs
CHANGELOG, WORKLOG, DOCS.md (rebuy semantics + the derived flag), BACKLOG.

## Verification

Full suite per CLAUDE.md §5 on the branch and again on the merged result. Plus a targeted
integration test proving a hand-entered session now earns the rebuy-based night titles it
previously never could.

# Codebase Analysis — 2026-07-30

A fresh, first-hand read of the whole repo (server, client, tests, docs). **This supersedes the
older files in `docs/ai-audit/`**, which were written at the 2026-03-17 audit and are now
materially wrong in places (e.g. `product-gap-analysis.md` and `open-questions.md` both claim
"no tests exist" and "no CI"; both have been false since PH-11…PH-13).

Scope: what the app *is* today, where it is strong, where it is genuinely at risk, and what the
codebase can and cannot support without new work. The feature plan that follows from this lives
in [`docs/superpowers/specs/2026-07-30-feature-roadmap.md`](../superpowers/specs/2026-07-30-feature-roadmap.md).

---

## 1. Verified baseline

Run in this worktree on 2026-07-30 after `npm run install:all`:

| Check | Result |
|-------|--------|
| `cd server && npm test` | **94 passed** (5 files) |
| `cd client && npx tsc --noEmit` | **clean** |
| `cd client && npm test` | **43 passed** (6 files) |
| `cd server && npm run test:integration` | not run here — needs local `poker_tracker_test` DB |
| `npm run test:e2e` | not run here — needs local `poker_tracker_e2e` DB |

Integration (6 spec files) and E2E (5 spec files) are exercised on every PR/push by
`.github/workflows/ci.yml`, which runs the entire suite against real Postgres services. The
untested-here suites are therefore *CI-verified*, not unverified — but the claims below are
grounded only in the suites I ran plus direct code reading.

**Overall engineering health: high.** This is a well-kept codebase. Money logic is isolated in
pure functions with real tests, the newer features (Insights, Banter Pack) follow a consistent and
genuinely good pattern — pure computation over already-fetched rows, thin fetch-and-delegate
service method — and the doc system is unusually disciplined. The problems below are concentrated
in the *older* strata of the code (backup, session summary, stats) that predate that pattern.

---

## 2. Architecture as it actually is

```
Browser (React 18 SPA, Vite, route-level lazy chunks)
  └── TanStack Query hooks (client/src/hooks/*)
        └── axios client (client/src/lib/api.ts) — one object per resource
              └── Express (server/src/app.ts): helmet · CORS allow-list · rate limit 300/min · 1MB body
                    └── routes/ → controllers/ (thin, next(error)) → services/ (logic) → Prisma → Postgres
```

Seven Prisma models: `Group`, `Player`, `Session`, `SessionEntry`, `RebuyEvent`, `PlayerNote`,
`SessionTemplate`. Everything else in the product — records, rivalries, form, the Belt, night
titles, achievements, the Money Race chart — is **derived on read** from those seven. That is a
deliberate and correct choice (D-004), and it is the single biggest reason this codebase is safe
to change: correcting a historical row re-derives every downstream story automatically.

**Two service generations coexist:**

- *Modern* (`insightsService`, `banterService`, `settlementService`, `utils/calculations`):
  exported pure functions taking plain row shapes, thin DB wrapper, heavily unit-tested. 94 of the
  94 server unit tests live here.
- *Legacy* (`sessionSummaryService`, `statsService`, `backupService`): logic interleaved with
  Prisma calls, `any`-typed parameters, no unit tests (only `statsService`'s pure
  `getTimeframeStart` is tested). Every finding in §3 is in this stratum.

---

## 3. Findings

Ordered by severity. Severity is judged against the operator's own stated top priority:
**historical poker data must remain intact.**

### 3.1 — CRITICAL: "Replace" restore is an unscoped, lossy database wipe

`backupService.importDatabase()` in `replace` mode
([backupService.ts:157](../../server/src/services/backupService.ts#L157)) runs:

```
tx.sessionEntry.deleteMany({})   // no where clause
tx.session.deleteMany({})
tx.playerNote.deleteMany({})
tx.player.deleteMany({})
tx.group.deleteMany({})
```

Three compounding problems:

1. **Unscoped.** It deletes *every group in the database*, not just the groups in the backup file.
   The export route is `GET /api/backup/export/:groupId`, but
   [`exportDatabase()`](../../server/src/services/backupService.ts#L40) ignores the param and dumps
   the whole DB — so the route's shape implies a per-group operation that neither side implements.
2. **The backup is lossy.** The export covers `groups`, `players`, `sessions`, `entries` — and
   nothing else. It omits:
   - `RebuyEvent` — every rebuy in group history
   - `PlayerNote` — deleted by `replace`, never re-imported by any code path
   - `SessionTemplate` — not exported, not deleted, orphaned by a replace
   - Session `status`, `settlements`, `completedAt`, `deletedAt` — not exported, and
     [not written on import](../../server/src/services/backupService.ts#L269)
3. **Soft deletes resurrect.** Because `deletedAt` is dropped, every session a user deliberately
   deleted comes back on restore as live data and silently re-enters every stat, record, and the
   Belt lineage.

Net effect: a user who follows the app's own advice ("have a backup first!") and does an
export → replace-restore round trip **permanently destroys** all rebuy events, all player notes,
all settlement records, and all soft-delete markers, and corrupts every rebuy-derived statistic.
The transaction wrapper does not help — the round trip completes "successfully".

### 3.2 — CRITICAL: the destructive endpoints are on the public internet with no authorization

[`docs/SECURITY.md`](../SECURITY.md) documents (as F-06, "accepted") that the server performs no
authorization and that the VIEWER/EDITOR role is a client-side `localStorage` flag. It closes with:
*"do not expose this deployment to untrusted networks without a network-level gate."*

That condition is not met. The app auto-deploys to a public Railway domain, and `CORS_ORIGIN` does
not gate anything except browsers — `curl` ignores CORS entirely. Any party who learns the URL can,
today, issue `POST /api/backup/import` with `mode: "replace"` and execute §3.1 against production,
or `DELETE /api/groups/:id` (which cascades everything).

The accepted-risk framing was reasonable for the *read* surface (names and game results are not
sensitive). It is not reasonable for an unauthenticated remote-wipe primitive. This is not a
hypothetical exposure — it is the current production configuration.

The fix does **not** require the full auth epic (IMP-011). A single shared secret checked by
middleware on mutating routes, or Railway-level basic auth, closes it in an afternoon.

### 3.3 — HIGH: rebuy-based features are structurally blind to manually-entered sessions

`RebuyEvent` rows are created **only** by `liveSessionService.addRebuy()`.
`sessionService.createSession()` never creates them, and neither does CSV import or backup restore.

Meanwhile the entire Banter Pack and half of Insights count rebuys by counting `RebuyEvent` rows:

| Feature | Source | Behaviour on a manually-entered session |
|---------|--------|------------------------------------------|
| ATM, Houdini (night titles) | `RebuyEvent` count | never awarded |
| Phoenix, Rebuy Royalty (achievements) | `RebuyEvent` count | never awarded |
| Records › most rebuys | `RebuyEvent` count | always 0 |
| Records › biggest comeback (needs ≥2 rebuys) | `RebuyEvent` count | never qualifies |

So a group that logs some nights live and enters others after the fact gets awards that are
silently biased toward the live-tracked nights. Nothing errors; the numbers are just quietly wrong,
which is the worst failure mode for a bragging-rights feature.

### 3.4 — HIGH: four different definitions of "rebuys" coexist

| Location | Formula | Yields for buyIn=$7, default=$5 |
|----------|---------|--------------------------------|
| [`calculations.ts:11`](../../server/src/utils/calculations.ts#L11) (used by `statsService`, `sessionService`) | `(buyIn − std) / std`, unfloored | `0.4` |
| [`sessionSummaryService.ts:267`](../../server/src/services/sessionSummaryService.ts#L267) | same, then `Math.round` | `0` |
| [`LiveSessionView.tsx:107`](../../client/src/pages/LiveSessionView.tsx#L107) | same, then `Math.floor` | `0` |
| `insightsService` / `banterService` | count of `RebuyEvent` rows | `0` or `1`, depending on how it was entered |

`PlayerStats.totalRebuys` is therefore a sum of *fractions* — a player with three $7 buy-ins is
reported as having "1.2 rebuys", and `rebuyRate` (rebuys/games × 100) inherits the nonsense. There
is one true source (`RebuyEvent`); everything else is arithmetic guessing at it.

### 3.5 — MEDIUM: `sessionSummaryService` is an N+1 hot spot and is untested

[`getSessionSummary`](../../server/src/services/sessionSummaryService.ts#L60) is the most
query-expensive path in the app, and it is called on every settlement screen:

- `calculateStreaks` — one `findMany` **per player in the session**
- `calculateMilestones` — one full-history `findMany` **per player**
- `getPreviousRank` (inside that loop) — recomputes the group's *entire* ranking history **per player**

An 8-player night issues on the order of 8 + 8 + 8 full-history scans plus two ranking passes, all
serialized. It works fine at home-game scale and would be the first thing to fall over at any
other scale. It also has **zero unit tests** and takes `entries: any[]`, so none of its
milestone/streak rules are pinned by anything.

This is the one file in the repo that most clearly wants the `insightsService` treatment: extract
pure functions over fetched rows, fetch once, test the rules.

### 3.6 — LOW: dead code

- [`client/src/main.ts`](../../client/src/main.ts) and
  [`client/src/counter.ts`](../../client/src/counter.ts) are the untouched Vite scaffold
  ("Vite + TypeScript", a click counter). `index.html` loads `main.tsx`; these two are unreferenced.
- `GET /api/stats/groups/:groupId/trends` → `statsService.getProfitTrend()` is the endpoint behind
  the chart deleted on 2026-07-12 for summing a zero-sum quantity. `useProfitTrend` exists in
  `useStats.ts` with **no consumer**. The endpoint still computes and serves the same meaningless
  number.
- `GET /api/stats/groups/:groupId/aggregates` → `useAggregatedStats` — also no consumer.
- `statsApi.checkSessionBalance` — no consumer (the endpoint itself is reasonable; the client
  method is dead).

### 3.7 — Notes, not defects

- **CSP is disabled** in helmet (`app.ts:26`) with an honest comment. Fine for a trusted single
  tenant; worth revisiting if §3.2 is ever addressed by exposing the app more widely.
- **`Session.photoUrls`** exists and is round-tripped by the API, but nothing writes to it — there
  is no upload path. The field is inert, not broken.
- **`html class="dark"`** is hardcoded; there is no light theme and no theme toggle. Deliberate,
  as far as I can tell.
- **Mobile** — the viewport meta is present and Tailwind responsive prefixes are used sparsely
  (19 occurrences across all page components). The app is usable on a phone but not designed for
  it; `LiveSessionView` in particular is a desktop table. Consistent with DECISIONS' note that
  usage is currently laptop-based.

---

## 4. Product read

The north star (D-001, D-002) is unusually clear and has been held to: *fun, social, bragging
rights; not a debt tracker, not a grinder tool.* The recent feature waves (Insights, then the
Banter Pack) are well-aimed at it — the Belt in particular is exactly the right kind of feature
for a recurring friend group.

Where the product is now **thin** relative to that north star:

1. **The live night itself.** Everything shipped in the last two waves happens *after* the game.
   The one screen used with people actually at the table — `LiveSessionView` — has had no product
   attention, and has a real functional hole: a player cannot leave early. Someone who quits at
   11pm has to be remembered in someone's head until the final cash-out.
2. **The end-of-night reconcile.** `calculateSessionSettlements` throws a `ValidationError` when
   cash-outs don't sum to buy-ins. Chip counts *never* match to the cent in a real home game, so
   this is a routine occurrence handled as an error the user must resolve by manually fudging a
   number until the app relents. The error message is good; the workflow is not.
3. **Sharing.** "Copy for WhatsApp" was the right instinct and clearly landed. The natural next
   step — an *image* rather than text — is missing, and images are what actually get forwarded.
4. **Identity.** A `Player` is a name and an optional avatar *URL*. Home games run on nicknames.
   There is no nickname field and no way to upload an image, so the trophy case and belt card have
   nothing to hang a personality on.
5. **Memory.** `photoUrls` has sat unused. The most-retold artifact of a poker night — the big hand
   — has nowhere to live except the free-text session `notes` field.
6. **Seasons.** Season Recap is hardcoded to the calendar year
   ([`insightsService.ts:511`](../../server/src/services/insightsService.ts#L511)). Groups think in
   seasons that start when they decide.

Where the product is (correctly) **complete enough**: settlement, leaderboard, records, rivalries,
form, the Belt, CSV import/export, templates, roles. I would not add to these.

---

## 5. What I would not build

Recorded here so it doesn't get re-proposed:

- **Full auth / multi-user (IMP-011).** §3.2 needs a *gate*, not an identity system. A shared
  secret gets 95% of the safety for 2% of the cost. Build real auth only if the app is ever
  offered to a second group outside the friend circle.
- **Tournament mode, game variants, blind structures.** One group, one game. Backlog P3 is the
  right place for these; nothing in the code suggests demand.
- **$/hour, variance, EV, tilt detection** — D-002, and the older `product-gap-analysis.md`
  recommends several of these. DECISIONS wins.
- **Cross-session debt ledger** — D-001.
- **Backend caching / pagination / Redis** — proposed in the stale audit. At home-game scale
  (one group, tens of players, hundreds of sessions) this is imaginary. §3.5 is a code-clarity
  problem, not a performance one.

---

## 6. Status of the older `docs/ai-audit/` files

| File | Status |
|------|--------|
| `product-gap-analysis.md` | **Stale.** Claims no tests, no CI, no rate limiting, no head-to-head, no session clone, no comparison view — all shipped. Recommends $/hr and variance, which D-002 rejects. |
| `open-questions.md` | **Stale.** Q4 (player notes), Q7 (testing) are answered; Q6 (photos) is still open. |
| `feature-inventory.md` | **Partially stale.** Missing the Insights and Banter Pack endpoints and pages. |
| `architecture-notes.md`, `domain-model.md`, `change-safety-notes.md`, `production-risk-audit.md` | Not re-verified in this pass. Treat as indicative. |
| `improvement-backlog.md`, `improvement-roadmap.md` | Superseded by root `BACKLOG.md` per CLAUDE.md §8. |

Recommendation: leave them as history, and treat this file as the current picture.

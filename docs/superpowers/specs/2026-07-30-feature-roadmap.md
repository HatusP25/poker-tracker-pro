# Feature Roadmap — 2026-07-30

Derived from [`docs/ai-audit/2026-07-30-codebase-analysis.md`](../../ai-audit/2026-07-30-codebase-analysis.md).
Every item is filtered through the north star (D-001, D-002): *a fun, social home poker game app
for a recurring friend group — not a debt tracker, not a grinder tool.*

Standing constraint honoured throughout: **no destructive change to historical poker data.** Where
a feature needs persistence, it adds new rows; it does not rewrite existing ones. Derived-on-read
(D-004) is preferred wherever it is possible.

Each item: **what · why it belongs · scope · effort · risk**. Effort S ≤ half a day, M ≈ 1–2 days,
L ≈ 3+ days, at this repo's TDD cadence.

Sequencing summary:

| Wave | Theme | Items |
|------|-------|-------|
| 0 | Stop the bleeding | F-01 · F-02 · F-03 |
| 1 | The live night | F-04 · F-05 · F-06 |
| 2 | Truth in the numbers | F-07 · F-08 |
| 3 | Banter & identity | F-09 · F-10 · F-11 |
| 4 | Memory | F-12 · F-13 |

Waves 0 and 2 are correctness/safety and should not be traded away for waves 3–4, which are the
fun ones. Wave 1 is the highest *product* value per unit of effort.

---

## Wave 0 — Stop the bleeding

These are not features. They exist because the app currently ships two ways to destroy the exact
data the operator has said must never be altered. Nothing else should ship before them.

### F-01 · Make backup lossless — **P0 · M · low risk**

**What.** Extend export and import to cover the whole domain: `RebuyEvent`, `PlayerNote`,
`SessionTemplate`, and the session fields currently dropped (`status`, `settlements`,
`completedAt`, `deletedAt`). Bump the backup `version` to `2.0.0`; keep reading `1.0.0` files, but
warn loudly on import that a v1 file cannot restore rebuys, notes, settlements, or deletion state.

**Why it belongs.** Today an export → replace-restore round trip permanently destroys all rebuy
history and all player notes, and resurrects every soft-deleted session into the live statistics.
The app's own UI tells users to take a backup before the operation that eats their data.

**Scope.** `server/src/services/backupService.ts` (export + import + `validateBackup`), a round-trip
integration test asserting byte-for-byte fidelity across all seven models, and a v1-file
compatibility test.

**Risk.** Low — new fields on an existing shape; the pure `validateBackup` is already isolated and
testable. Verify against a *copy* of production data, never production itself.

### F-02 · Scope and fence the restore — **P0 · S · low risk**

**What.** Three changes:
1. `exportDatabase()` honours the `:groupId` its route already declares (add an all-groups variant
   explicitly, if wanted).
2. `replace` mode deletes only within the groups present in the backup file — never `deleteMany({})`.
3. The Settings UI requires typing the group name to confirm a replace, the way GitHub does for
   repository deletion.

**Why it belongs.** `replace` currently wipes every group in the database regardless of what the
backup file contains. A user restoring "Thursday Night" would silently lose "Sunday Game".

**Scope.** `backupService`, `backupController`, `Settings.tsx`. Integration test: a two-group DB,
restore a one-group backup, assert the other group is untouched.

**Risk.** Low, and it *reduces* blast radius by construction.

### F-03 · Gate the mutating API — **P0 · S · low risk**

**What.** Middleware requiring a shared secret (`X-Api-Key` against an `API_KEY` env var) on every
non-GET route plus `/api/backup/import`. The client reads it from a build-time env var. If
`API_KEY` is unset, log a loud warning and pass through, so local dev is unaffected.

**Why it belongs.** The app auto-deploys to a public Railway domain and performs no server-side
authorization; CORS does not restrict non-browser clients. `POST /api/backup/import` with
`mode: "replace"` is an unauthenticated remote-wipe primitive on the open internet.
[`docs/SECURITY.md`](../../SECURITY.md) already says not to deploy this way.

**Explicitly not the auth epic.** No `User` model, no login, no sessions. VIEWER/EDITOR stays a
client-side convenience. This is a lock on the front door, and it is roughly 40 lines.

**Scope.** New `server/src/middleware/requireApiKey.ts`, wired in `app.ts`; `client/src/lib/api.ts`
axios default header; `.env.production.example`; a `SECURITY.md` update superseding F-06's
"accepted" status; integration tests for 401-without-key and 200-with-key.

**Risk.** Low technically; **operationally it is a deploy that can lock the user out of their own
app if the client and server keys disagree.** Ship it with the pass-through fallback, set the env
var, verify, then enforce.

---

## Wave 1 — The live night

Everything shipped in the last two waves happens *after* the game. This wave is the screen used
with people actually sitting at the table, and it is where the product is thinnest.

### F-04 · Early cash-out ("Dave's leaving at 11") — **P1 · M · medium risk**

**What.** In a live session, cash a player out without ending the session: record their `cashOut`,
mark the entry settled, and keep them visible in standings as "cashed out — up $12". End-of-night
then only asks for cash-outs from players still at the table, and the settlement math already
covers everyone.

**Why it belongs.** People leave home games early, constantly. Today the app has no concept of it:
you must remember the departing player's stack in your head (or on paper) until the end of the
night, which is exactly the sort of error the app exists to prevent. This is the clearest
*functional* hole in the app, not a nice-to-have.

**Scope.** Needs schema: `SessionEntry.cashedOutAt DateTime?` (additive, nullable — no rewrite of
existing rows). `liveSessionService.cashOutPlayer()`; guard rails: cannot rebuy after cashing out,
cannot cash out the last two players (that's ending the session), can undo a cash-out while the
session is live. `EndSessionDialog` pre-fills and locks already-settled players.

**Risk.** Medium — it touches the live money path. The zero-sum check in
`calculateSessionSettlements` is the safety net and stays authoritative. TDD mandatory (golden
rule 4/5).

### F-05 · Reconciliation helper — **P1 · S · medium risk**

**What.** When end-of-night cash-outs don't sum to buy-ins, stop treating it as a form error.
Show the discrepancy prominently and offer three one-tap resolutions: *split the difference evenly
across players still at the table*, *assign it to one player* (pick who miscounted), or *keep
editing*. Whatever is chosen writes real `cashOut` values, so the session still reconciles exactly
and settlement math is untouched.

**Why it belongs.** Chip counts never match to the cent. Today this routine end-of-night moment is
a hard `ValidationError` that the user resolves by nudging an arbitrary number until the app
accepts it — undocumented, unattributed, and done under time pressure while everyone wants to go
home. This is the single most common friction point in the product.

**Scope.** Pure function `client/src/lib/reconcile.ts` (TDD: even split with remainder handling,
single-assignee, rounding to cents) + `EndSessionDialog` UI. **Server unchanged** — the zero-sum
validator stays exactly as strict as it is today; this only helps the user produce numbers that
satisfy it.

**Risk.** Medium by category (money), low by construction (client-side helper, server validator
unchanged and still authoritative).

### F-06 · Phone-first live session — **P1 · M · low risk**

**What.** Rework `LiveSessionView` and its dialogs for one-handed phone use: standings as cards
rather than a table, thumb-reachable Rebuy/Add/End actions, larger tap targets, numeric keypad
input modes on all money fields.

**Why it belongs.** It is the one screen used *during* the game, and it is a desktop data table.
F-04 and F-05 both land here — doing them on the current layout means doing the layout work twice.
DECISIONS notes usage is currently laptop-based; that is at least partly a consequence of the
screen being unusable on a phone.

**Scope.** `LiveSessionView.tsx`, `RebuyDialog`, `AddPlayerDialog`, `EndSessionDialog`,
`RebuyItinerary`. No API changes. Playwright mobile viewport coverage.

**Risk.** Low — presentational, and E2E already covers the live flow.

---

## Wave 2 — Truth in the numbers

The Banter Pack's credibility depends on its awards being right. Two of them currently aren't.

### F-07 · One definition of a rebuy — **P1 · M · medium risk**

**What.** Make `RebuyEvent` the single source of truth for rebuy counts everywhere, and backfill
it for non-live sessions.

Two halves:
1. **Write rebuys on manual entry.** `sessionService.createSession()`/`updateSession()` derive
   rebuy events from the entered buy-in above the group default and persist them, so a
   hand-entered night is indistinguishable from a live-tracked one downstream. CSV import likewise.
2. **Read them consistently.** `statsService`, `sessionService.getSessionById`,
   `sessionSummaryService`, and `LiveSessionView` all count `RebuyEvent` rows instead of doing
   their own buy-in arithmetic. Retire `calculateRebuys` or reduce it to a single documented
   fallback for legacy rows with no events.

**Why it belongs.** Today ATM, Houdini, Phoenix, Rebuy Royalty, "most rebuys" and "biggest
comeback" count `RebuyEvent` rows — which only exist for *live-tracked* sessions. A group that logs
some nights live and enters others afterward gets awards silently biased toward the live nights.
Separately, four different formulas for "rebuys" coexist, and `PlayerStats.totalRebuys` sums
*fractional* rebuys ("1.2 rebuys"). A bragging-rights app whose brags are wrong is worse than one
without them.

**Backfill and the data rule.** Existing historical sessions have no `RebuyEvent` rows. The backfill
**adds** rows derived from data already stored in `SessionEntry.buyIn`; it does not modify or delete
any existing row. It ships as a reversible, idempotent script run against a restored copy first,
never as an implicit migration side effect. If the user prefers, it can be skipped entirely and the
read path can fall back to buy-in arithmetic for event-less sessions — but then the bias stays, so
the recommendation is to backfill.

**Scope.** `sessionService`, `statsService`, `sessionSummaryService`, `LiveSessionView`, a backfill
script under `server/scripts/`, and tests pinning that every rebuy consumer agrees.

**Risk.** Medium — it changes reported numbers (correctly), and it writes rows to historical
sessions. Needs the user's explicit go-ahead on the backfill specifically, and a verified restore
point before it runs.

### F-08 · Refactor and test `sessionSummaryService` — **P2 · M · low risk**

**What.** Apply the `insightsService` pattern: fetch the group's sessions once, then run pure,
exported, unit-tested functions (`computeRankingChanges`, `computeStreakUpdates`,
`computeMilestones`, `computeHighlights`) over plain row shapes. Replace `any[]` with real types.

**Why it belongs.** It is the app's most query-expensive path (one full-history query *per player*
in `calculateMilestones`, plus a full ranking recomputation per player inside that loop), it runs on
every settlement screen, and it has zero unit tests — so none of its milestone or streak rules are
pinned by anything. It is also the natural home for extending milestones later.

**Scope.** `server/src/services/sessionSummaryService.ts` + a new test file. No API shape change, so
the client and existing integration tests are the regression net.

**Risk.** Low — behaviour-preserving refactor behind an unchanged contract, with tests added first
to lock in current output.

---

## Wave 3 — Banter & identity

The fun ones. All derived-on-read or purely additive.

### F-09 · Shareable image cards — **P2 · M · low risk**

**What.** One-tap PNG generation for three things that already exist as data: the night result
card (results, night titles, settlements, belt line), a belt-change card ("👑 Ana takes the belt
from Dave — 6-night reign ends"), and the Season Wrapped card. Rendered client-side to canvas from
the existing components, downloaded or shared via the Web Share API.

**Why it belongs.** "Copy for WhatsApp" clearly landed — it was the right instinct. But images are
what actually get forwarded and re-posted in group chats; text gets skimmed. This is the highest
social-return item on the list, and it needs **zero schema and zero new computation** — every input
already exists (`nightMessage.ts`, `beltLine.ts`, the season recap endpoint).

**Scope.** A small `client/src/lib/shareCard.ts` (canvas rendering, TDD-able for layout math), a
share button on `SettlementView`, `SessionDetail`, `BeltCard`, and `SeasonRecapModule`. Closes the
existing BACKLOG P2 "make Season Recap screenshot/shareable" item, generalised.

**Risk.** Low — additive, read-only, client-only.

### F-10 · Nicknames and avatars — **P2 · M · low risk**

**What.** Add `Player.nickname String?` (additive). Show it as `Ana "The Closer" R.` on the trophy
case, belt card, night titles, and share cards; plain name everywhere data-dense (tables,
leaderboard). Optionally allow avatar *upload* rather than the current URL-only field — this shares
the storage decision with F-12, so sequence it after that call is made.

**Why it belongs.** Home games run on nicknames. The Belt and the trophy case are personality
features with no personality attached to them — a `Player` is currently a name and an unused avatar
URL. Cheap, and it makes every existing banter feature land harder.

**Scope.** Migration (one nullable column), `playerService`, `EditPlayerDialog`, display components.

**Risk.** Low — nullable additive column, no behaviour change when unset.

### F-11 · Configurable seasons — **P2 · M · low risk**

**What.** Let a group define a season (a name and a date range) instead of hardcoding the calendar
year, and keep a history of past seasons with their champion. Season Recap, the Rank Race chart,
and leaderboard timeframes all gain a "This season" option.

**Why it belongs.** `insightsService.getSeasonRecap()` is hardcoded to Jan 1 – Dec 31. Groups think
in seasons that start when they decide (a new year of the game, after a big roster change). Already
on the backlog as part of "Insights polish"; promoting it because it also unlocks a durable
"season champions" wall, which is the same bragging-rights vein as the Belt.

**Scope.** New `Season` model (`groupId`, `name`, `startDate`, `endDate`) — purely additive, no
existing row touched; `insightsService.getSeasonRecap(groupId, seasonId)` with the calendar-year
path retained as the default; Settings UI to define seasons; season selector on the Insights recap
card.

**Risk.** Low — new table, existing behaviour preserved as the default.

---

## Wave 4 — Memory

### F-12 · Photos — **P2 · L · medium risk**

**What.** Upload photos to a session and view them in a gallery on the session detail page. The
`Session.photoUrls` field already exists and is round-tripped by the API; nothing writes to it
because there is no upload path.

**Why it belongs.** Photos are the memory layer of a home game, and this is the oldest unfinished
thread in the schema. Long-standing BACKLOG P2, correctly annotated there as blocked on an upload
mechanism.

**The real decision is storage, not UI.** Railway's filesystem is ephemeral, so this needs either a
Railway volume or an external object store (Cloudinary/S3/R2 free tiers all suffice at home-game
volume). That choice — cost, an external dependency, and a second place where the group's data
lives — is the user's to make, and it is why this is L rather than M. **Do not start this without
that decision.**

**Scope.** Storage adapter + upload endpoint (with size/type limits and the F-03 gate applied),
`photoUrls` writes, gallery component, and — importantly — inclusion in F-01's backup coverage.

**Risk.** Medium — first external dependency, first binary data, first thing in the system that a
database backup does not capture.

### F-13 · Hand of the Night — **P3 · M · low risk**

**What.** A lightweight structured "moments" log on a session: who was in the hand, roughly what
happened (free text), and optionally the pot size. Surfaced on session detail, in the WhatsApp
message, and on the share card.

**Why it belongs.** The most-retold artifact of a poker night is one hand, and it currently has
nowhere to live but the unstructured session `notes` field. This is the highest-ceiling banter
feature — and the most speculative, because it depends on someone actually bothering to type it
in during a game. **Prototype it inside the existing `notes` field before committing to a table.**

**Scope.** Start with zero schema: a convention on `Session.notes`. Only promote to a `SessionMoment`
model if the group actually uses it.

**Risk.** Low technically, high in adoption uncertainty — hence P3 and the notes-first approach.

---

## Continuous — hygiene

Not a wave; fold into whatever branch touches the area.

- **Delete the Vite scaffold.** `client/src/main.ts` and `client/src/counter.ts` are the untouched
  "Vite + TypeScript" click-counter template, unreferenced by `index.html`. **S.**
- **Retire the dead trend endpoints.** `GET /stats/groups/:groupId/trends` still computes the
  zero-sum quantity whose chart was deleted on 2026-07-12; `useProfitTrend`, `useAggregatedStats`,
  and `statsApi.checkSessionBalance` have no consumers. Remove the endpoint and hooks, or give
  `/trends` a real meaning. **S.**
- **Refresh `docs/ai-audit/`.** `product-gap-analysis.md` and `open-questions.md` assert there are
  no tests and no CI, and recommend metrics D-002 rejects. Any agent reading them cold gets a wrong
  picture. Either update or mark superseded. **S.**

---

## Rejected — do not re-propose without reversing a decision

| Idea | Why not |
|------|---------|
| Full auth / multi-user (`IMP-011`) | F-03 buys the actual safety for ~2% of the cost. Revisit only if a second, non-friend group is onboarded. |
| Cross-session debt ledger | D-001. |
| $/hour, variance, std-dev, EV, tilt detection | D-002. (The stale `product-gap-analysis.md` recommends several of these — DECISIONS wins.) |
| Tournament mode, game variants, blind structures | One group, one game. Stays P3 unless the group starts playing them. |
| Redis / backend caching / leaderboard pagination | Imaginary at home-game scale. F-08 addresses the underlying code-clarity issue. |
| Push notifications, PWA/offline | Only meaningful if usage moves to phones — revisit *after* F-06, not before. |

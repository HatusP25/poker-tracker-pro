# Worklog

Running log of changes made to Poker Tracker Pro during the production-hardening engagement.
Newest entries at the top. Backlog: [BACKLOG.md](./BACKLOG.md). Review:
[REVIEW-2026-06-12.md](./REVIEW-2026-06-12.md).

Each entry records: what changed, why, the backlog item, and the verification that it is green.

Live backlog is now [/BACKLOG.md](../BACKLOG.md); high-level summary log is [/CHANGELOG.md](../CHANGELOG.md).

---

## 2026-08-03 — Player nicknames (F-10)

**Why** Roadmap F-10. The Belt and the trophy case are personality features, but a `Player` was a
name and an avatar URL nothing ever wrote to. Nicknames are what a home game actually runs on, and
they pair directly with F-09's share cards — a card wants the handle, not the legal name.

**Scope call.** F-10 as written also covered avatar *uploads*, which share a storage decision with
F-12 (Railway volume vs object store) that is the user's to make. Nicknames need no such decision,
so they shipped alone; avatar upload stays with F-12.

**Where a nickname shows, and where it doesn't.** Story surfaces get it — the Belt, night titles,
player page, players list, share cards. Data-dense surfaces keep the plain name: leaderboard,
ranking tables, charts, Hall of Fame records. A long handle in a table column costs more than it
adds.

**Changed**
- Migration `20260803202604_add_player_nickname` — one nullable column; no row read or rewritten.
- `client/src/lib/displayName.ts` (new, +9 unit tests) — `displayName` / `hasNickname`. Trims,
  ignores whitespace-only handles, and ignores a nickname that merely repeats the name so nobody
  gets `Ana "Ana"`.
- `isValidNickname` caps at 24 characters. Blank is *valid* and means "no nickname" — that is how
  one is cleared, and the service stores it as null.
- Threaded through the player selects on session includes, so `session.entries[].player.nickname`
  reaches the share cards.
- `BeltCard` resolves nicknames against the roster it already fetches, so no API shape changed.
- `NightTitleChips` takes an optional `playerId -> display name` map and falls back to the server's
  plain name.
- `shareCard.heroSize` steps the belt hero down for long names (+2 tests).

**Caught during verification.** The first UI check showed no nicknames at all. The cause was not
the code: **port 3001 was held by a stale dev server from the main repo**, whose Prisma client
predates the column, so the API returned `nickname: null` for everyone. Worth recording because the
symptom looked exactly like a broken feature.

**F-08 paying off.** Nicknames survive a backup round trip with *zero* change to backup code — the
schema-driven row mapping picked the new column up on its own. Pinned by a test, and the first real
demonstration that the three-strikes bug class is closed.

**Verification** server unit 236 ✓ · integration 118 ✓ · server tsc ✓ · client tsc ✓ ·
client unit 106 ✓ · build ✓ · E2E 17 ✓. Visually confirmed in the running app (players list, night
titles, Belt) and in rendered share cards.

---

## 2026-08-03 — Shareable image cards (F-09)

**Why** The WhatsApp text shipped in the Banter Pack clearly landed, but text is skimmed in a group
chat while images get forwarded and re-posted. Roadmap F-09; the highest social return on the list
and the cheapest, since every input already exists.

**Design — pure layout, impure rendering.** `client/src/lib/shareCard.ts` builds a declarative
`Scene` (positioned text/rect/line items with colours) and knows nothing about canvas, so all the
layout maths is unit-testable. `renderShareCard.ts` turns a scene into a PNG and hands it to the
share sheet. Splitting there is what makes 23 meaningful unit tests possible on something that is
ultimately an image.

**Changed**
- `shareCard.ts` (new, +23 unit tests) — `buildNightCardScene`, `buildBeltCardScene`,
  `buildSeasonCardScene`. Tests pin the things that would actually be wrong in a shared image:
  players ordered by profit exactly as the text message orders them, colour by sign, sections
  omitted when empty rather than printed blank, height growing with content, and every item inside
  the card bounds.
- `renderShareCard.ts` (new) — 2x canvas for crispness when a chat client scales it, emoji-capable
  font stack, `navigator.share` with a download fallback. An `AbortError` from the share sheet is
  reported as `cancelled`, so dismissing it doesn't trigger a download the user didn't ask for.
- `nightShareData.ts` (new) — `buildNightShareInput`, the single description of a night. Both
  SettlementView and SessionDetail had duplicated this inline; now the text and the image are
  built from one object and cannot disagree.
- `ShareCardButton.tsx` (new) — builds the scene lazily, so nothing is laid out until someone
  actually shares.
- Wired into SettlementView, SessionDetail, BeltCard and SeasonRecapModule.
- E2E `share-card.spec.ts` — clicks the button, captures the download, and asserts the bytes start
  with the PNG signature and are a plausible size. Headless Chromium has no share sheet, so this
  exercises the fallback path.

**Verified visually, not just asserted.** Bundled the real modules with esbuild and rendered all
three cards in headless Chromium. The first pass exposed something no assertion would have: the
belt card mixed a centred name with left/right rows and left a dead gap, reading as unfinished.
Reworked it into a proper hero block (centred name at 104px, one centred stat line) and gave every
card more air below its header.

**Verification** server unit 236 ✓ · integration 110 ✓ · server tsc ✓ · client tsc ✓ ·
client unit 95 ✓ · client build ✓ · E2E 17 ✓ against the production artifact.

---

## 2026-08-02 — Session summary refactor + schema-driven backup (F-08)

**Why** Two problems named in the analysis (§3.5) and one pattern that had bitten three times.

`backupService` hand-listed each model's columns in its create/update calls. The export comes from
`findMany` so it always carried every column, but the import silently dropped anything not on the
list — surfacing only when someone restored. `status`/`settlements`/`completedAt`/`deletedAt`
(F-01), `cashedOutAt` (F-04) and `derived` (F-07) were each caught by luck rather than design.

`sessionSummaryService` issued one full-history query per player in the session, plus a full
ranking recomputation nested in that loop, and had zero unit tests because every rule was tangled
up with Prisma.

**Changed**
- `server/src/services/backupRows.ts` (new, +22 unit tests) — `coerceBackupRow` projects a backup
  row onto exactly the scalar columns Prisma's DMMF declares for that model, converting DateTimes.
  Absent fields are omitted so schema defaults apply (this is how a v1 file still imports); unknown
  fields are dropped so a hand-edited file can't reach Prisma. The test builds a complete row per
  model from the schema and asserts every field survives, so a future column can't be dropped
  silently. `BACKED_UP_MODELS` is asserted equal to the schema's model list.
- `backupService.importDatabase` — the seven per-model blocks collapse into one `IMPORT_ORDER`
  table plus a single upsert loop. No field lists remain.
- `server/src/services/sessionSummaryRules.ts` (new, +29 unit tests) — `computeRankings`,
  `sessionsUpTo`, `computeRankingChanges`, `computeHighlights`, `computeStreakUpdates`,
  `computeMilestones` as pure functions over plain rows, per the insightsService convention. The
  milestone and streak rules now have tests for the first time.
- `sessionSummaryService` — fetches the session plus the group's history in two queries, then
  delegates. Dropped from 507 lines to ~110, and `any[]` params are gone.

**Measured, not assumed.** Instrumented the Prisma client with `$use` and ran a real summary on an
8-player night with 12 nights of history: **25 queries before, 2 after** — and constant now, where
it previously grew as 2 + 3n in the number of players.

**Behaviour preserved** — the 110 integration tests and the E2E settlement flow exercise this
endpoint and stayed green throughout, which is the regression net for a refactor of this size.

**One deliberate change:** sessions sharing a date now sort by `createdAt` as a tie-break. The
previous ordering was undefined, so streak results could differ between identical calls.

**Verification** server unit 236 ✓ · integration 110 ✓ · server tsc ✓ · client tsc ✓ ·
client unit 72 ✓ · E2E 16 ✓ against the production artifact.

---

## 2026-08-02 — Wave 2: one definition of a rebuy (F-07)

**Why** `RebuyEvent` rows were written only by `liveSessionService.addRebuy()`. A hand-entered,
CSV-imported or v1-restored session had none, yet the Banter Pack counts those rows — so ATM,
Houdini, Phoenix, Rebuy Royalty, most-rebuys and biggest-comeback structurally skipped every
session not tracked live. The brags were biased, silently, which is the worst failure mode for a
bragging-rights feature. Analysis §3.3/§3.4. Plan:
`docs/superpowers/plans/2026-07-30-wave-2-rebuy-truth.md`.

**Design decision — derived vs recorded.** A live rebuy is an observed event with a real
timestamp; a rebuy inferred from a hand-entered total is a reconstruction. Conflating them would
mean a later edit could silently destroy real history, so `RebuyEvent.derived` (additive,
`@default(false)` — which is what every existing row already means) keeps them distinguishable.
Only derived rows are ever rewritten, and an entry that carries any recorded rebuy is left alone
entirely rather than reconstructed on top of.

**Changed**
- `server/src/utils/rebuys.ts` (new, +24 unit tests) — pure `deriveRebuyAmounts(buyIn, default)`.
  Excess split into full-size rebuys plus a remainder; the amounts always sum to the excess to the
  cent, so a reconstruction can't disagree with the recorded money. Guards: nonsensical inputs
  return nothing, never a zero-amount rebuy, and a 100-row cap so a fat-fingered buy-in can't
  generate unbounded inserts (the overflow collapses into the final rebuy, preserving the total).
- Migration `20260802045701_add_rebuy_event_derived` — one boolean with a default; no row read or
  rewritten.
- `sessionService` — `createSession` and `addSessionEntry` write derived rows; `updateSessionEntry`
  re-derives via a new private `reDeriveRebuyEvents` that deletes only `derived: true` rows and
  bails entirely when recorded rebuys exist. `getSessionById` counts rows instead of doing
  arithmetic.
- `statsService.getPlayerStats` — `totalRebuys` is now a `rebuyEvent.count()` scoped to
  non-deleted sessions, so it's an integer instead of a sum of fractions.
- `sessionSummaryService.calculateHighlights` — takes a rebuy-count map rather than re-deriving
  from `defaultBuyIn`.
- `LiveSessionView` — counts `rebuyEvents` rather than flooring a buy-in ratio.
- `backupService` — round-trips `derived`, defaulting a missing value to `false` so a restore can
  never reclassify real history as a guess.
- `server/scripts/backfill-rebuy-events.ts` (new) — see below.

**Backfill script, verified by hand against `poker_tracker_test`:** refuses to run without
`--expect`, refuses when `--expect` doesn't match the URL, dry-runs by default with a full
per-session plan, applies, is a no-op on a second run, and `--undo --apply` removes exactly the
derived rows while leaving a recorded live rebuy untouched. Buy-ins and cash-outs verified
unchanged before and after. **It was not run against production** — that is an operator action,
after a verified backup.

**Bug caught before shipping (again):** backup import lists `rebuyEvent` fields explicitly, so
`derived` would have been silently dropped on restore — the same class of bug as `cashedOutAt` in
Wave 1 and the whole of Wave 0's F-01. Round-trip test added. This is now three occurrences;
`sessionSummaryService`'s F-08 refactor should consider whether the explicit field lists in
`backupService` want a shared, exhaustive mapping instead.

**Correction made before this reached the user.** As first written, F-07 counted RebuyEvent rows
and nothing else — so every session predating rebuy-event writing would have reported **0 rebuys**
until the backfill script was run. That is a visible regression on real history, gated behind a
manual step, which is exactly the wrong trade. Fixed by deriving on read: `resolveRebuyCount` and
`withDerivedRebuyEvents` fill the gap per player for any session with no recorded events, wired
into `sessionService`, `statsService`, `sessionSummaryService`, `insightsService` and
`banterService`. Recorded rows still win outright — a live night with one $20 rebuy reports 1, not
the 4 its total implies. The backfill script is now an optimisation that persists the derivation
and changes no displayed number. This is the D-004 principle the rest of the codebase already
follows; reaching for a migration script first was the mistake.

**Verification** server unit 185 ✓ · integration 110 ✓ · server tsc ✓ · client tsc ✓ ·
client unit 72 ✓ · E2E 16 ✓ against the production artifact.

---

## 2026-07-30 — Wave 1: the live night (F-04, F-05, F-06)

**Why** The last two feature waves both landed *after* the game. `LiveSessionView` — the one
screen used with people at the table — had had no product attention and carried a real functional
hole. Spec: `docs/superpowers/specs/2026-07-30-feature-roadmap.md` (Wave 1). Plan:
`docs/superpowers/plans/2026-07-30-wave-1-live-night.md`.

**Changed**
- **F-04 early cash-out.** Migration `20260730220435_add_session_entry_cashed_out_at` — one
  nullable column, no data touched (`ALTER TABLE ... ADD COLUMN "cashedOutAt" TIMESTAMP(3)`);
  null means "still at the table", which is what every pre-existing row already means.
  New pure `liveSessionRules.ts` (+19 unit tests): `planEarlyCashOut`, `planUndoCashOut`,
  `entriesAwaitingCashOut`, following the insightsService convention so every rejection branch is
  testable without a DB. `liveSessionService.cashOutPlayer` / `undoCashOut`; `addRebuy` rejects a
  cashed-out player; `endSession` only demands numbers for `entriesAwaitingCashOut` and takes the
  recorded value for everyone else — a stale resubmitted value for a departed player is ignored
  rather than overwriting a real result. `reopenSession` deliberately keeps early cash-outs.
  Routes `POST /live-sessions/:id/cash-out` and `DELETE /live-sessions/:id/cash-out/:playerId`.
  Client: `CashOutDialog`, per-player action on the standings card, `useCashOutPlayer` /
  `useUndoCashOut`. Integration: `tests/integration/earlyCashOut.test.ts` (17).
- **F-05 reconciliation.** Pure `client/src/lib/reconcile.ts` (+18 unit tests):
  `computeDiscrepancy`, `splitEvenly`, `assignToOne`. All arithmetic in integer cents so the
  adjusted set sums *exactly* to the buy-in total; indivisible remainders go out a cent at a time
  (a 3-way split of $1.00 is 0.34/0.33/0.33); refuses rather than clamping when an adjustment
  would drive a cash-out below zero. `EndSessionDialog` surfaces the difference and the two
  resolutions. **Server untouched** — `calculateSessionSettlements` stays as strict as it was.
- **F-06 phone-first.** New `PlayerStandingCard` replaces the four-column standings table (one
  layout for both phone and desktop — a home game is under ten players, so cards read fine on a
  laptop). Action bar is `sticky bottom-0` on small screens. `inputMode="decimal"` on every money
  input across live and session forms. `EndSessionDialog` rows stack below `sm`.

**Bugs found and fixed while here**
- `EndSessionDialog` allowed a **1% tolerance** the server rejects outright, so a large pot could
  pass the client check and then fail the request. It now matches the server exactly.
- Backup import listed `sessionEntry` fields explicitly, so the new `cashedOutAt` would have been
  silently dropped on restore — the exact class of bug Wave 0 existed to kill. Caught before
  shipping; round-trip test added.

**Verified visually, not just asserted:** screenshots at 390px and 1280px during development
caught the End Session dialog overflowing a phone viewport (values clipped off-screen) and a
bare-icon cash-out button that was unreadable without a label. Both fixed.

**Verification** server unit 152 ✓ · integration 92 ✓ · server tsc ✓ · client tsc ✓ ·
client unit 72 ✓ · client build ✓ · E2E 16 ✓ against the production artifact.

---

## 2026-07-30 — Wave 0: data safety (F-01, F-02, F-03)

**Why** A full codebase analysis (`docs/ai-audit/2026-07-30-codebase-analysis.md`) found two
paths that destroy historical poker data — the thing the operator has stated must never be
altered. Spec: `docs/superpowers/specs/2026-07-30-feature-roadmap.md` (Wave 0). Plan:
`docs/superpowers/plans/2026-07-30-wave-0-data-safety.md`.

The three findings, in the order they were fixed:

1. **F-03 — public unauthenticated mutation.** `main` auto-deploys to a public Railway domain and
   the server does no authorization. `CORS_ORIGIN` restricts browsers, not `curl`. So
   `POST /api/backup/import` with `mode:"replace"` was an unauthenticated remote-wipe primitive
   reachable by anyone who learned the URL. `docs/SECURITY.md` had already warned not to deploy
   this way (F-06); the condition was simply not met.
2. **F-01 — lossy backup.** `exportDatabase()` covered four of seven models. A round trip through
   export → replace-restore permanently destroyed `RebuyEvent`, `PlayerNote` and
   `SessionTemplate` rows, discarded session `status`/`settlements`/`completedAt`, and dropped
   `deletedAt`, resurrecting soft-deleted sessions into every statistic and the Belt lineage.
3. **F-02 — unscoped wipe.** `replace` ran `deleteMany({})` on every table with no `where`,
   deleting all groups regardless of the backup file's contents.

**Changed**
- `server/src/middleware/requireApiKey.ts` (new, +15 unit tests) — gates non-idempotent verbs on
  `X-Api-Key` vs `process.env.API_KEY`. Reads `API_KEY` per request (rotatable without restart),
  compares in constant time without leaking length, and is a **no-op when unset** so dev/CI are
  untouched. `logApiKeyStatus()` warns at startup if unset in production. Wired in `app.ts` after
  the rate limiter; client sends the header from `VITE_API_KEY`.
  Integration: `tests/integration/apiKey.test.ts` (7).
- `server/src/services/backupService.ts` — rewritten for **format v2**. Exports all seven models
  plus every session lifecycle field; `exportDatabase(groupId?)` scopes to one group; `scope.groupIds`
  records the blast radius. `validateBackup` branches on version, requiring the v2 arrays and
  warning on v1 files about exactly what they cannot restore. `importDatabase` deletes only within
  `collectBackupGroupIds(backup)`, imports all seven models in FK order, and **refuses** replace for
  v1 files and for files naming no groups. Transaction budget raised to 120s (a real group's restore
  exceeds Prisma's 5s interactive default). New pure exports `isLegacyBackup` /
  `collectBackupGroupIds` (+24 unit tests). Route `GET /backup/export/:groupId` added.
  Integration: `tests/integration/backup.test.ts` (16) — including a byte-for-byte round trip after
  a total wipe, a bystander-group-untouched assertion, and soft-deletes staying deleted.
- `client/src/lib/backupScope.ts` (new, +11 unit tests) — pure `describeReplaceScope` /
  `isReplaceConfirmed`. `Settings.tsx` holds a replace in `pendingReplace` state and opens an
  AlertDialog naming the affected groups; the action stays disabled until the user types the group
  name (or `REPLACE ALL` for a multi-group file), and v1 files get an explanation instead of a
  confirm button. Export is now two buttons (this group / all groups).
  E2E: `e2e/backup-safety.spec.ts` (2).
- Docs: `docs/SECURITY.md` rewritten (F-06 downgraded from "accepted" to "partially mitigated",
  plus the mandatory two-step key rollout and a data-destruction-safety section); `DOCS.md` gains
  a Backup & Restore API section with the v2 format and an API-authentication note;
  `.env.production.example` gains `API_KEY`/`VITE_API_KEY` with rollout ordering.

**Judgement calls**
- Reads are left ungated. Names and game results are not sensitive; destructive mutation is the
  risk, and gating reads would break nothing but buy nothing.
- The gate is a shared secret, not the auth epic (`IMP-011`). It is ~40 lines and closes the actual
  exposure; a `User` model would not.
- v1 files remain importable in `merge` mode. Refusing them outright would strand anyone holding
  only an old backup.

**Verification** server unit 133 ✓ · integration 74 ✓ · server tsc ✓ · client tsc ✓ ·
client unit 54 ✓ · client build ✓ · E2E 11 ✓ against the production artifact.

---

## 2026-07-12 (batch 4) — Chart truth & polish

**Why** Chart audit (user-requested) found Analytics' flagship "Profit Over Time" chart
summed profit across all players per session — zero-sum, so it plotted ~$0 ± entry drift
labeled as "cumulative profit". Also: top-5 cutoff on Player Comparison, four dead chart
components, and no cumulative-$-per-player chart (the one poker groups actually want).
Spec: `docs/superpowers/specs/2026-07-12-chart-truth-polish-design.md`. Client-only.

**Changed** `MoneyRaceChart.tsx` (replaces `ProfitChart.tsx` in the same Analytics slot,
inherits date-range filter) with pure TDD'd `lib/moneyRace.ts` (5 tests: carry-forward
through skipped sessions, mid-range joiners, date/createdAt sort); `PlayerComparisonChart`
shows all players; `BeltTimeline.tsx` inside `BeltCard` with pure `lib/beltSegments.ts`
(3 tests); deleted `DayOfWeekChart`, `SessionsChart`, `WinRateDistributionChart`,
`dashboard/ProfitTrendChart` (grep-verified unreferenced).

**Verification** client unit 43 ✓ · client tsc ✓ · build ✓ · server suites unaffected ✓ ·
E2E 9 ✓ on merged result.

---

## 2026-07-12 (batch 3) — The Banter Pack

**Why** PM-driven feature wave: pure bragging-rights value for the group. Spec + plan under
`docs/superpowers/` (belt succession rule chosen by the user: head-to-head). Hard constraint
honored by construction: **zero schema changes, zero writes to historical data** — everything
is computed on read (D-004 precedent), so corrected history always re-derives correctly.

**Changed**
- `server/src/services/banterService.ts(+37-test)` — pure `computeBeltLineage`,
  `computeNightTitles`, `computeAchievements`; fetch-and-delegate `getBelt`/`getAchievements`;
  types in `server/src/types/banter.ts` mirrored client-side. Endpoints
  `GET /stats/groups/:groupId/belt` and `/achievements`; `titles` added to the session summary
  (`sessionSummaryService.ts`). Integration: `tests/integration/banter.test.ts` (6).
- Client: `BeltCard` + `RecentUnlocks` on Insights, `TrophyCase` on PlayerDetail with
  localStorage one-time unlock toasts, `NightTitleChips` + Copy-for-WhatsApp on
  SettlementView/SessionDetail; pure TDD'd `nightMessage.ts` (8 tests) + `beltLine.ts`
  (6 tests); `useBelt`/`useAchievements` hooks.
- E2E `e2e/banter.spec.ts` (3): belt card with champion, trophy case (unlock toast observed
  live during the test), WhatsApp button.

**Verification** server unit 94 ✓ · integration 51 ✓ · typechecks ✓ · client unit 35 ✓ ·
E2E 9 ✓ (production artifact) · build ✓.

---

## 2026-07-12 (batch 2) — Template quick-start, player notes, location chart, code-splitting

**Why** Continue closing backlog items after the correctness batch below. All P1/P2 feature items
now shipped except the photo gallery (blocked on an upload mechanism).
**Uncommitted by request** — left in the working tree for review alongside batch 1.

**Changed**
- **Template quick-start (P2)** — `LiveSessionStart.tsx` now embeds `TemplateSelector` (prefills
  active players at group default buy-in, location, start time; skipped inactive/deleted players
  surfaced via toast) and `SaveTemplateDialog` wired to `useCreateTemplate`.
- **Player notes & tags (PH-14/IMP-003)** — `PlayerNote` model had no API/UI. Added
  `GET/POST /players/:playerId/notes`, `PATCH/DELETE /players/notes/:noteId` (service validation:
  trimmed non-empty content; tags stored as JSON string per the `photoUrls` convention). New
  `usePlayerNotes.ts` hooks, `PlayerNotes.tsx` card on `PlayerDetail` (tag Badge chips, inline
  edit/delete EDITOR-only), new shadcn `textarea.tsx`. TDD: 12 integration tests written failing-first.
- **Pot by location chart (PH-15/IMP-001)** — pure `aggregateProfitByLocation()` in
  `client/src/lib/locationStats.ts` (+5 unit tests; case-insensitive grouping, "Unspecified" bucket),
  `ProfitByLocationChart.tsx` following `DayOfWeekChart`'s pattern, placed on `Analytics.tsx` and
  inheriting its date-range filter. Note: `DayOfWeekChart` itself was deliberately removed from
  Analytics in commit 36f82b7; left that decision intact.
- **Client code-splitting (P1, follow-up 2026-06-19)** — route-level `React.lazy`/`Suspense` in
  `App.tsx` (shell/providers eager, 13 route pages lazy, new `RouteLoader.tsx` fallback) + vendor
  `manualChunks` in `vite.config.ts` (react/router/query/recharts/ui). Initial chunk 1,118 kB →
  169.6 kB (gzip 53.7 kB); Recharts (404 kB) loads only on chart routes; >500 kB warning gone.

**Verification** server unit 57 ✓ · integration 45 ✓ · server+client typecheck ✓ · client unit 21 ✓ ·
E2E 6 ✓ (code-split production artifact) · client build ✓ (no chunk-size warning).

---

## 2026-07-12 — Leaderboard timeframes, reopen-window fix, rebuy edit/undo, settlement paid tracking

**Why** Close the remaining "ready for real weekly games" gaps: the leaderboard was all-time only,
a mis-entered rebuy couldn't be corrected mid-game, the 24h reopen window silently re-extended on
any session edit (PH-10), and settlement transfers had no paid/pending state (BACKLOG P1).
**Uncommitted by request** — left in the working tree for review; nothing committed or pushed.

**Changed**
- **Leaderboard timeframes** — `GET /groups/:groupId/leaderboard?timeframe=all|year|month|week`
  (default `all`, unchanged behavior; invalid → 400). Pure `getTimeframeStart()` helper in
  `statsService.ts` (week is Sunday-based, matching `getProfitTrend`); metric formulas untouched.
  Rankings page gained a timeframe `Select` (All Time / This Year / This Month / This Week).
- **PH-10 reopen-window fix** — additive `Session.completedAt DateTime?` column (migration
  `20260712045404_add_session_completed_at`, applied to dev/test/e2e DBs). Stamped on every
  COMPLETED transition; `reopenSession` now checks `completedAt ?? updatedAt` and clears it on reopen.
- **Rebuy edit/undo (PH-16/IMP-008)** — `PATCH`/`DELETE /live-sessions/:sessionId/rebuys/:rebuyId`;
  atomic `$transaction` updates RebuyEvent + SessionEntry.buyIn (guards amount > 0, buyIn > 0,
  IN_PROGRESS only). Inline edit/delete controls in `RebuyItinerary`, EDITOR-gated.
- **Settlement paid tracking (P1)** — optional `paid` flag inside the existing settlements JSON
  (no migration; per-session only per DECISIONS D-001). `PATCH /sessions/:sessionId/settlements/:index`
  via pure `setSettlementPaid()` helper. New shared `SettlementList` component ("N of M settled",
  EDITOR checkbox toggle) used in `SettlementView` and a new Settlement card on `SessionDetail`.
- **Role-gating consistency** — Add Rebuy / Add Player / End Session in `LiveSessionView` now
  hidden for VIEWER (pre-existing gap).

**Files** Server: `statsService.ts(+test)`, `statsController.ts`, `liveSessionService.ts`,
`liveSessionController.ts`, `sessionService.ts`, `sessionController.ts`, `settlementService.ts(+test)`,
`calculations.ts(+test)`, `routes/{stats,liveSessions,sessions}.ts`, `types/index.ts`,
`prisma/schema.prisma` + migration, `tests/integration/{leaderboardTimeframe,liveSession,sessionSettlements}.test.ts`.
Client: `Rankings.tsx`, `LiveSessionView.tsx`, `SettlementView.tsx`, `SessionDetail.tsx`,
`components/live/RebuyItinerary.tsx`, new `components/session/SettlementList.tsx`,
`hooks/{useStats,useLiveSessions,useSessions}.ts`, `lib/api.ts`, `types/index.ts`.

**Verification** server unit 57 ✓ · integration 33 ✓ · server+client typecheck ✓ · client unit 16 ✓ ·
E2E 6 ✓ (production artifact) · client build ✓.

---

## 2026-06-19 — Insights: The Story of Your Game

**Why** Find feature gaps that add real value to a *home* poker group. Chosen direction: social,
bragging-rights analytics (not grinder/bankroll metrics — see [DECISIONS.md](./DECISIONS.md) D-001/D-002).

**Changed** New read-only `/insights` area (`G+I`), separate from Analytics ([DECISIONS](./DECISIONS.md) D-003).
Four modules — Hall of Fame & Records, Rivalries/Head-to-Head, Form & Momentum, Season Recap
("Poker Wrapped") — plus a shared chart layer (theme, momentum sparklines, rank-over-time "Race for
#1" bump chart). All derived from existing data, **no schema changes**, nothing touches money/settlement
logic ([DECISIONS](./DECISIONS.md) D-004).

**Files** Backend: `server/src/services/insightsService.ts(+test)`, `server/src/types/insights.ts`,
4 controllers + routes in `statsController.ts`/`routes/stats.ts`, integration tests in
`tests/integration/api.test.ts`. Frontend: `client/src/pages/Insights.tsx`,
`client/src/components/insights/**` (4 modules + `charts/`), `client/src/hooks/useInsights.ts`,
`insightsApi` in `lib/api.ts`, mirrored types, route/nav/shortcut/palette wiring. E2E:
`e2e/insights.spec.ts`. Docs: spec + plan under `docs/superpowers/`, `DOCS.md`, `README.md`.

**Verification** server unit 40 ✓ · integration 12 ✓ · client typecheck ✓ · E2E 6 ✓ · build ✓.
Merged to `main` and deployed.

**Follow-up flagged** Client bundle ~1.1 MB / ~318 kB gzip (Vite >500 kB warning) — pre-existing,
tracked in `docs/follow-ups/2026-06-19-bundle-code-splitting.md`.

---

## 2026-06-16 — PH-17: money-input guardrails

**Why** A cash-out could be typed negative (nonsensical — floor is $0). Hardened all money
inputs at the point of entry to mirror the server's existing limits. Design:
`docs/superpowers/specs/2026-06-16-money-input-guardrails-design.md`.

**Changed**
- New `client/src/lib/moneyValidation.ts` — single source of truth for buy-in (>0, ≤1000),
  cash-out (≥0, ≤10000), rebuy (>0, ≤1000), plus `clampCashOut`. Built test-first (16 unit tests).
- Set up Vitest in `client/` (`npm test`); was previously test-free.
- Wired the helper into every money input with inline error messages + `min`/`max`, and folded
  validity into the action's disabled state:
  - `EndSessionDialog` — per-player cash-out error; **clamps negatives to 0 on blur**; End Session
    disabled while any cash-out is invalid.
  - `EntryRow` + `SessionForm` — buy-in/cash-out errors; Create Session disabled when a player row
    holds an invalid value; cash-out blur-clamp.
  - `RebuyDialog` — rebuy amount error; Add Rebuy disabled when invalid.
  - `LiveSessionStart` — buy-in entry now uses the shared rule (rejects ≤0 / over-cap).
- Playwright E2E (`e2e/money-guardrails.spec.ts`): negative cash-out shows the message, disables
  End Session, and clamps to 0 on blur; entry form blocks a negative buy-in.
- CI now also runs the client unit tests.

**Verification** server unit 27 ✓ · integration 8 ✓ · client unit 16 ✓ · E2E 4 ✓ · both builds ✓ ·
typecheck ✓.

**Files** `client/src/lib/moneyValidation.ts(+test)`, `client/vitest.config.ts`,
`client/package.json`, `client/src/components/{live/EndSessionDialog,live/RebuyDialog,sessions/EntryRow,sessions/SessionForm}.tsx`,
`client/src/pages/LiveSessionStart.tsx`, `e2e/money-guardrails.spec.ts`, `.github/workflows/ci.yml`.

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

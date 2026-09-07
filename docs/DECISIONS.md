# Decision Log

Standing product and architecture decisions. Append a new entry when a decision is made or
reversed; don't silently contradict an existing one — supersede it explicitly. Agents should read
this before proposing features so we don't re-litigate settled calls.

Format: `D-NNN — Title (date, status)` then Context / Decision / Consequences.

---

## D-001 — This is a home-game app, not a debt tracker (2026-06-19, accepted)

**Context:** When exploring feature gaps, a cross-session "who owes whom" ledger (carrying unsettled
balances between nights, payment status over time) looked high-value on paper.

**Decision:** Rejected as a product direction. The app is a *fun, social home poker game app* for a
recurring friend group. It is explicitly **not** a debt/collections tracker. Per-session settlement
calculation stays; an optional *per-session* paid/pending status is acceptable (see BACKLOG P1), but
balances do **not** persist across sessions into a running ledger.

**Consequences:** Backlog and Insights are framed around story/bragging-rights, not money owed.
Don't add cross-session debt features without reversing this entry.

---

## D-002 — No grinder/bankroll metrics ($/hour, variance) (2026-06-19, accepted)

**Context:** `startTime`/`endTime` are captured, so $/hour, hourly win rate, and variance/std-dev
were natural "performance analytics" candidates.

**Decision:** Rejected. These are serious-poker/bankroll-management metrics that don't resonate with a
casual home game. The user explicitly disliked the $/hour direction.

**Consequences:** "Performance analytics" for this app means social/competitive storylines (records,
rivalries, form, season recap), not efficiency metrics. Time fields remain stored but unused for $/hr.

---

## D-003 — Insights is a separate area from Analytics (2026-06-19, accepted)

**Context:** The four Insights modules could have been bolted onto the existing `/analytics` page.

**Decision:** Built a dedicated `/insights` area instead. `/analytics` is the *data toolbox* (filter,
compare, drill into numbers); `/insights` is the *story* (records, rivalries, momentum, recap).

**Consequences:** Existing Analytics charts were left untouched. Insights modules are independent,
read-only cards under `client/src/components/insights/`. New chart styling lives in a shared layer
intended to be reusable by Analytics later if desired.

---

## D-004 — Insights is additive & derived; no schema changes (2026-06-19, accepted)

**Context:** Records/rivalries/form/season could have introduced new tables (e.g. stored badges).

**Decision:** All Insights data is computed on read from existing models (`Session`, `SessionEntry`,
`RebuyEvent`, `Player`). No migrations; nothing touches money/settlement logic.

**Consequences:** Zero deployment/data risk for the feature. Computations are pure functions over
fetched rows (`insightsService.ts`), unit-testable without a DB. If a future feature needs persistence
(e.g. stored achievements), that's a new decision.

---

## D-005 — Deployment & workflow discipline (pre-existing, documented 2026-06-19)

**Context:** `main` auto-deploys to Railway production on push.

**Decision:** Never work on `main`; always branch. The full suite (unit + integration + e2e +
typecheck) must be green before any merge/push. Pushing `main` is a production deploy and requires
user confirmation.

**Consequences:** Codified in [CLAUDE.md](../CLAUDE.md) §2. CI enforces the suite on every PR/push.

---

## D-006 — Statistics count only completed sessions (2026-08-31, accepted)

**Context:** An in-progress session stores `cashOut = 0` for everyone still at the table. Nothing in
the stats path filtered on `status`, so the moment a live night started, every player at it appeared
as a catastrophic loss in the leaderboard, player stats, dashboard, streaks, trend, records,
rivalries, form and the season recap. Only `banterService` filtered correctly.

**Decision:** A session counts towards statistics only when it is `status = 'COMPLETED'` and not
soft-deleted. `COMPLETED_SESSION_FILTER` in `server/src/services/statsRules.ts` is the single
definition, applied in SQL by every group-history query.

**Consequences:** A live night is invisible to every aggregate surface until it is ended, which is
the only honest reading of a night with no results yet. Single-session endpoints
(`/stats/sessions/:id/stats`, `/stats/sessions/:id/balance-check`) are deliberately exempt — they
are asked about that one session, and the live table depends on the zero-sum check. Any new
group-history query must use the shared filter rather than re-deriving it.

---

## D-007 — Every player gets a story, and the server scores it (2026-08-31, accepted)

**Context:** Every headline metric in the app was a superlative exactly one person owned. A player
down $60 across 20 nights opened the app and found nothing about themselves.

**Decision:** The server derives a catalogue of per-player angles (rivalries, attendance, droughts,
splits, rebuy dollars, departures, night ranks, form) and scores them for specificity, evidence and
recency, returning the best few as **structured facts**. The client owns every word of the copy; the
server never returns prose. Losing/absent angles are weighted as highly as winning ones, and a
guaranteed career fallback means the list is never empty.

**Consequences:** New angles are added to `anglesRules.ts` with a weight, a strength function, a
minimum sample and a family; the family dedupe keeps the returned set from repeating itself. Because
the payload is facts rather than sentences, tone and wording stay a client concern and can change
without a server deploy.


## D-008 — The stats hub narrows, but does not reverse, D-003 (2026-08-31, accepted)

**Context:** D-003 split the app into `/analytics` (a data toolbox) and `/insights` (the story). In
practice the toolbox spread across four pages — Dashboard, Rankings, Analytics and the player page —
with enough overlap that "biggest win" appeared four times under three different definitions, three
separate components drew a cumulative-profit line, and five drew a streak. "Where do I find X?" had
no answer because X was in three places.

**Decision:** The toolbox stops being its own page and becomes `/stats`, a hub of four routed tabs
(Standings, Trends, Rivals, Player). `/rankings`, `/analytics` and `/players/:id` redirect into it,
so existing links, bookmarks and e2e deep-links keep working. **Insights stays a separate area and
does not absorb the charts** — D-003's actual intent, the separation of story from toolbox, is
preserved. The Dashboard stops being a fourth copy of the toolbox and becomes a home screen.

**Consequences:** The tab lives in the URL, so it is linkable and survives a reload. A new numeric
surface belongs in a hub tab, not a new top-level route. The nav has one Stats entry instead of two,
which is also what let the eight-item header stop overflowing at 1440px.

## D-009 — Player colour is assigned across the roster, not hashed per player (2026-08-31, accepted)

**Context:** Player identity colour was a hash of the player id against a nine-hue palette. With five
players that collides about three times in four, and it did: two of five shared a hue in every chart,
chip and avatar. Charts that used `assignPlayerColors` over their own subset also disagreed with
chips that used the raw hash, so one player could be two colours on a single screen.

**Decision:** The roster is registered once at the layout level and `playerColor(id)` reads that
assignment, falling back to the hash for anyone outside the current group (a departed player still
in the history keeps a stable colour). Each player still starts from their hashed preference and only
moves if it is taken, so adding a member rarely disturbs anyone else.

**Consequences:** Colour is group-scoped, not global — the same person in two groups may differ, which
is the right trade for never colliding inside the group people actually look at. Past nine players the
palette is exhausted and colours repeat by design; inventing a tenth hue would collide with the
profit/loss semantics the palette deliberately avoids.

---

## D-010 — Deactivated players are invisible on derived surfaces (2026-09-07, accepted)

**Context:** `Player.isActive` was a roster flag, not a visibility flag. It gated the picker for new
sessions and nothing else. Deactivated players kept a place in the standings, in group records, in
season recaps, in the rivals grid and in every player's story angles — and, because the belt only
changes hands when the holder is beaten on a night they play, a deactivated player could hold The
Belt permanently. Root cause was architectural: the rule functions read `SessionEntry` rows and join
only `player.name`, so `isActive` was never in scope.

**Decision:** a deactivated player is **absent from every derived surface** and **fully present in
every record of a night that actually happened**. Four sub-decisions:

- **D-A — session records stay whole.** Session detail, entries, settlements and pot totals are
  unchanged. Those `SessionEntry` rows are load-bearing: `settlementService` validates buy-ins equal
  cash-outs, so hiding them would make past nights fail zero-sum. Deactivation is an aggregate-level
  concept, not a data-level one.
- **D-B — night-level totals stay whole.** Pot size, players-per-night, average session size and the
  group's night count describe *the night*, not the roster. Only per-player callouts go active-only.
- **D-C — fully retroactive.** Derived surfaces compute as if the player never played. Accepted cost:
  a completed season's story can change. Chosen over a "current standings only" split for one rule
  and one filter point rather than a per-surface policy.
- **D-D — the session summary splits by rule.** The three cross-night rules filter *both* of their
  inputs, so the ranks they quote match the standings. Highlights, night titles, player count and pot
  keep the whole entry list.

**Consequences:** No schema change and no persisted derived state, consistent with D-004 — everything
is computed on read, so reactivating restores every surface exactly. The behaviour lives in one pure
function, `filterRowsToActive` (`server/src/services/activeRoster.ts`); every `compute*` rule kept
its signature and its tests.

Two deliberate exceptions on the client. The **Players tab** stays unfiltered — it is where players
are managed. **`AppLayout`'s roster stays unfiltered** because it feeds the colour registry from
D-009: colours are assigned across the whole roster, so filtering it would re-shuffle or strip the
colour of a deactivated player on the historical session detail that D-A says must not change.

The filter's `dropEmpty` option exists for one genuine conflict between D-B and the belt. A night
only departed players attended empties out; `computeBeltLineage` must not see it (it banks
`nightsHeld` before checking attendance, so it would award a free reign defence), while the angles
engine must (it is the denominator for every attendance rate).

Full design: [docs/superpowers/specs/2026-08-24-deactivated-player-visibility-design.md](superpowers/specs/2026-08-24-deactivated-player-visibility-design.md).

# Backlog

The single **live** prioritized list of future work. When asked "what's next", pull from here.
When an item ships, remove it and add a [CHANGELOG.md](CHANGELOG.md) entry. When an item is
deferred mid-flight, give it a self-contained file in `docs/follow-ups/` and link it here.

> **Sources folded in here:** the production-hardening backlog
> ([docs/BACKLOG.md](docs/BACKLOG.md), PH-* — kept as history) and the detailed feature backlog
> ([docs/ai-audit/improvement-backlog.md](docs/ai-audit/improvement-backlog.md), IMP-*). Open items
> from those are listed below with their original IDs. This root file is the one to keep current.

**Filter every idea through the product north star:** this is a *fun, social home poker game app*
for a recurring friend group — not a debt tracker, not a grinder/bankroll tool. See
[docs/DECISIONS.md](docs/DECISIONS.md). Ideas that don't add real value to that audience don't belong here.

Legend: `P0` before anything else · `P1` now-ish · `P2` soon · `P3` someday. Effort: S/M/L.

> **2026-07-30 refresh.** Repopulated from a full codebase analysis
> ([docs/ai-audit/2026-07-30-codebase-analysis.md](docs/ai-audit/2026-07-30-codebase-analysis.md))
> and the feature plan derived from it
> ([docs/superpowers/specs/2026-07-30-feature-roadmap.md](docs/superpowers/specs/2026-07-30-feature-roadmap.md)).
> F-* ids below refer to that roadmap, which carries the full rationale, scope and risk for each.

---

## P0 — Data-safety

*(empty — F-01, F-02 and F-03 shipped 2026-07-30, see [CHANGELOG.md](CHANGELOG.md))*

> **Deploy action still outstanding:** `API_KEY` must actually be set in Railway for the gate to
> do anything, and the rollout is two-step — set `VITE_API_KEY` in the client build and confirm
> the header is sent *before* setting `API_KEY` on the server, or every write 401s. See
> [docs/SECURITY.md](docs/SECURITY.md#deploying-the-api-key).

## P1 — High value, ready to pick up

*(F-04, F-05, F-06 shipped 2026-07-30 and F-07 shipped 2026-08-02, see [CHANGELOG.md](CHANGELOG.md))*

> **Operator action outstanding:** existing sessions still have no rebuy events until the backfill
> is run. New and edited sessions are already correct. Take a backup, then:
> ```
> cd server && DATABASE_URL=<prod> npx tsx scripts/backfill-rebuy-events.ts --expect <db-name>
> ```
> That is a dry run; add `--apply` to write, `--undo --apply` to reverse.

## P2 — Worth doing, not urgent

- **[P2·M] F-08 Refactor + test `sessionSummaryService`.** N+1 per player (plus a full ranking
  recompute per player), zero unit tests, `any[]` params. Apply the `insightsService` pattern.
- **[P2·M] F-09 Shareable image cards.** PNG for night result / belt change / Season Wrapped.
  Zero schema — all inputs already exist. (Generalises the old "Insights polish" item.)
- **[P2·M] F-10 Nicknames + avatar uploads.** `Player.nickname`; the Belt and trophy case have no
  personality attached to them. Avatar upload shares F-12's storage decision.
- **[P2·M] F-11 Configurable seasons.** Season Recap is hardcoded to the calendar year. New
  additive `Season` model; unlocks a season-champions wall.
- **[P2·L] F-12 Photo upload + gallery.** `Session.photoUrls` has always been inert.
  **Blocked on a storage decision** (Railway volume vs external object store) — that call is the
  user's, and it's why this is L.

## P3 — Someday / ideas

- **[P3·M] F-13 Hand of the Night.** Structured "moments" per session. Prototype inside the
  existing `notes` field before committing to a table — adoption is the real risk.
- **[P3·M] Achievements / badges** as persisted unlockables (currently computed live, not stored).
- **[P3·L] Tournament mode** (placements, blind structures) — only if the group actually plays tournaments.
- **[P3·M] Export to PDF reports** (season recap, player cards).
- **[P3·M] PWA / offline** — revisit *after* F-06, not before.
- **[P3·S] Multi-group comparisons.**

## Hygiene — fold into whatever branch touches the area

- **[S] Delete the Vite scaffold** — `client/src/main.ts` + `client/src/counter.ts` are the
  untouched template click-counter, unreferenced by `index.html`.
- **[S] Retire dead trend endpoints** — `/stats/groups/:groupId/trends` still serves the zero-sum
  quantity whose chart was deleted 2026-07-12; `useProfitTrend`, `useAggregatedStats` and
  `statsApi.checkSessionBalance` have no consumers.
- **[S] Refresh `docs/ai-audit/`** — `product-gap-analysis.md` and `open-questions.md` claim there
  are no tests and no CI, and recommend metrics D-002 rejects.

---

## Explicitly NOT doing (rejected — don't re-add without re-deciding)

- **Cross-session debt ledger / "who owes whom over time."** Out of product scope. (DECISIONS §D-001)
- **$/hour, variance, std-dev, and other grinder/bankroll metrics.** Wrong audience. (DECISIONS §D-002)
- **Full auth / multi-user (IMP-011).** F-03 buys the actual safety for ~2% of the cost. Revisit
  only if a second, non-friend group is onboarded.
- **Redis / backend caching / leaderboard pagination.** Imaginary at home-game scale; F-08 covers
  the real (code-clarity) problem.

See [docs/DECISIONS.md](docs/DECISIONS.md) for the reasoning behind the first two.

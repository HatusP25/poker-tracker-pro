# Backlog

The single prioritized list of future work. When asked "what's next", pull from here.
When an item ships, remove it and add a [CHANGELOG.md](CHANGELOG.md) entry. When an item is
deferred mid-flight, give it a self-contained file in `docs/follow-ups/` and link it here.

**Filter every idea through the product north star:** this is a *fun, social home poker game app*
for a recurring friend group — not a debt tracker, not a grinder/bankroll tool. See
[docs/DECISIONS.md](docs/DECISIONS.md). Ideas that don't add real value to that audience don't belong here.

Legend: `P1` now-ish · `P2` soon · `P3` someday. Effort: S/M/L.

---

## P1 — High value, ready to pick up

- **[P1·M] Client code-splitting / bundle size.** Single ~1.1 MB chunk (~318 kB gzip); Vite warns
  >500 kB. Route-level `React.lazy` + vendor `manualChunks`. Performance-only, no UI change.
  → Full brief: [docs/follow-ups/2026-06-19-bundle-code-splitting.md](docs/follow-ups/2026-06-19-bundle-code-splitting.md)

- **[P1·M] Settlement payment tracking.** Mark each computed settlement transfer as paid/pending so
  the group can see what's been squared up *within a night's settlement*. NOTE: keep this as
  per-session settlement status only — do **not** turn it into a cross-session debt ledger
  (explicitly out of scope, see DECISIONS). Needs a schema change (settlement paid state).

## P2 — Worth doing, not urgent

- **[P2·M] Session Templates & Quick Start.** Models already exist (`SessionTemplate`). Wire up UI to
  save a recurring lineup/location/time and start a session in one tap.
- **[P2·S] Player Notes & Tags surfacing.** `PlayerNote` (with tags) exists in the schema but is
  underused in the UI. Surface notes/tags on player pages.
- **[P2·M] Photo gallery per session.** `Session.photoUrls` already stored; build a gallery view.
- **[P2·S] Insights polish.** Make the Season Recap card one-tap screenshot/shareable; consider a
  configurable "season" date range beyond calendar year.

## P3 — Someday / ideas

- **[P3·M] Achievements / badges** as persisted unlockables (Form-board badges are currently computed
  live, not stored).
- **[P3·L] Tournament mode** (placements, blind structures) — only if the group actually plays tournaments.
- **[P3·M] Export to PDF reports** (season recap, player cards).
- **[P3·M] PWA / offline** — only matters if usage shifts to phone-at-the-table (currently laptop; see DECISIONS).
- **[P3·S] Multi-group comparisons.**

---

## Explicitly NOT doing (rejected — don't re-add without re-deciding)

- **Cross-session debt ledger / "who owes whom over time."** Out of product scope. (DECISIONS §D-001)
- **$/hour, variance, std-dev, and other grinder/bankroll metrics.** Wrong audience. (DECISIONS §D-002)

See [docs/DECISIONS.md](docs/DECISIONS.md) for the reasoning behind these.

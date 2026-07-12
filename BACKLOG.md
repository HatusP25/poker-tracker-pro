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

Legend: `P1` now-ish · `P2` soon · `P3` someday. Effort: S/M/L.

---

## P1 — High value, ready to pick up

*(empty — previous P1 items shipped 2026-07-12, see CHANGELOG)*

## P2 — Worth doing, not urgent

- **[P2·M] Photo gallery per session.** `Session.photoUrls` already stored; build a gallery view.
  NOTE: needs an upload/attach mechanism first — a gallery alone has no way to get photos in.
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

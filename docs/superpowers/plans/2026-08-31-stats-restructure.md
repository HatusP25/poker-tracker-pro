# Stats & Charts Restructure — Implementation Plan

Spec: [2026-08-31-stats-restructure-design.md](../specs/2026-08-31-stats-restructure-design.md)
Branch: `claude/app-stats-redesign-dee19a` (worktree)
Baseline to hold green: **server unit 262 · server integration 138 · client unit 106 · both typechecks**

Work is waved so that parallel agents never share a file. Ownership is explicit and exclusive.

---

## Wave 1 — Foundation (design system)

**Owns:** `client/src/index.css`, `client/tailwind.config.js`, `client/package.json`,
`client/index.html`, `client/src/lib/viz/**`, `client/src/components/ui/**`,
`client/src/components/insights/charts/chartTheme.ts`, `client/src/components/layout/**`

1. Surface elevation ladder — `--card` lifted off `--background`, shadow scale for a dark ground.
2. Semantic `--profit` / `--loss` / `--neutral` tokens, three-way, de-conflicted from `--primary`.
3. Type scale with a display tier for hero numerals; `tabular-nums` as the default for figures.
4. Stable per-player colour keyed on player **id**; `PlayerChip` primitive.
5. Chart system — `chartTheme.ts` driven by CSS vars, one `ChartFrame`, one `ChartTooltip`,
   height scale, shared margins, capped categorical scale with an "others" bucket.
6. Primitives — `StatTile`, `DeltaChip`, `EmptyState`, `Meter`, Radix `Tabs` + `Tooltip`.
7. `tailwindcss-animate` installed (also fixes the dead dialog animations); motion vocabulary.
8. Currency-aware money formatting fed by `group.currency`.
9. Mobile navigation (below 768px there is currently none at all).

**Exit:** client tsc clean, client unit green, primitives documented well enough to code against.

## Wave 2 — Backend (runs parallel to Wave 1, disjoint files)

**Owns:** `server/**`, `client/src/types/**`, `client/src/lib/api.ts`, `client/src/hooks/**`

1. Extract `statsService`'s inline math into pure `statsRules.ts` + tests (currently the
   untested flank: 7 tests covering one date helper).
2. Correctness fixes, each with a failing test first — `COMPLETED` filter, ordered "last 5",
   `reduce` seed, dead `include`.
3. New derived metrics — nemesis/favourite-victim (already computed, never rendered),
   attendance, drought, day-of-week (UTC), venue effect on profit, table size, rebuy dollars,
   co-attendance matrix, early departures, best-night ranking.
4. The **player-story selector** — scores every candidate angle per player and returns the
   best few as structured data. Must produce something for a losing player, a rare attendee,
   and a lapsed member. Zero angles is a bug.

**Exit:** server unit + integration green, both typechecks clean, types mirrored to the client.

## Wave 3 — Surfaces (after 1 and 2 land; agents run in parallel, one page each)

| Agent | Owns | Builds |
|---|---|---|
| Standings | `pages/Stats/Standings*` | Leaderboard: champion row celebrated, sparkline column, per-player story chip, season/timeframe scoping, sort that doesn't desync from `rank` |
| Trends | `pages/Stats/Trends*`, `components/analytics/**` | Fewer, bigger charts, each answering one question. Money Race and Race for #1 promoted; venue chart re-pointed at profit; dual-axis session-size chart cut |
| Rivals | `pages/Stats/Rivals*` | Full head-to-head matrix + pair detail; surfaces nemesis / favourite victim |
| Player card | `pages/PlayerCard*` | The per-player story page — the thesis surface. Grinder metrics demoted, ledger UI removed |
| Home | `pages/Dashboard.tsx` | The pulse: last night, the belt, who's hot, your headline. Quick Actions card deleted |
| Insights | `components/insights/**` | Tighten: section rhythm, unified loading, `RankRaceChart` given a header, raw `<select>`s replaced |

Shared: `pages/Stats/index.tsx` (the tabbed hub + redirects) is built first and owned by the
Standings agent; the others mount into it.

## Wave 4 — Integration

1. Route redirects: `/rankings` → `/stats/standings`, `/analytics` → `/stats/trends`,
   `/players/:id` → `/stats/player/:id`.
2. Update E2E specs that assert on the old UI — part of green, not extra.
3. Responsive pass; verify nothing breaks at 390px.
4. Full suite, then before/after screenshots of every surface at both widths.
5. Docs: `CHANGELOG.md`, `docs/WORKLOG.md`, `BACKLOG.md`, `DOCS.md`, and a new
   `docs/DECISIONS.md` entry narrowing D-003.

---

## Risks

- **E2E specs assert on the current UI** (`insights`, `banter`, `seasons`, `share-card`,
  `smoke`). Budget for updating them.
- **Client unit tests pin pure chart helpers** (`moneyRace`, `beltSegments`, `locationStats`,
  `shareCard`, `beltLine`, `displayName`). Prefer keeping the helpers and changing only
  presentation; rewriting them weakens the safety net.
- **Share cards and the WhatsApp text share one input** (`nightShareData.ts`). Changing how a
  night's numbers are ordered or labelled must flow through both or they silently diverge —
  the exact bug F-09 was built to prevent.
- **Recharts is a 400KB lazy chunk.** Keep it out of the initial bundle; do not pull charts
  onto the entry route.
- **`main` auto-deploys to production.** Full suite green before merge; confirm before push.

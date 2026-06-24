# Follow-up: Client bundle is too large — introduce code-splitting

**Created:** 2026-06-19
**Status:** Open / not started
**Owner:** unassigned (safe to pick up cold)
**Triggered by:** Insights feature work (`feat/insights-home-game-story`), where the
Vite build began warning about chunk size again.

---

## Problem

The client builds into a single oversized JS chunk. Latest production build:

```
dist/assets/index-<hash>.js   ~1,118 kB │ gzip: ~318 kB
```

Vite emits: *"Some chunks are larger than 500 kB after minification."*

This is **pre-existing**, not introduced by the Insights feature — but Insights (a new
page that pulls in more Recharts usage) adds to it, which is what surfaced the warning.
Everything is bundled into one entry chunk: every route/page, Recharts, cmdk, etc. There
is currently **no route-based code-splitting and no manual chunking**.

## Why it matters

- First-load payload is ~318 kB gzipped for a fairly simple app; users download all routes
  (Analytics, Insights, Live Session, Settings…) even if they only open the Dashboard.
- Recharts is heavy and is only needed on chart-bearing routes (Analytics, Insights,
  PlayerDetail). It should not be in the initial chunk.

## Context / where things live

- Build tool: **Vite** (`client/`). Build via `npm run build` (root) or `cd client && npm run build`.
- Router: **React Router v7**, routes declared in `client/src/App.tsx` inside a single
  `<Routes>` block under `<Route element={<AppLayout />}>`. All page components are
  **statically imported** at the top of `App.tsx` (e.g. `import Insights from '@/pages/Insights'`).
- Heavy deps: `recharts` (charts), `cmdk` (command palette). Chart components live in
  `client/src/components/analytics/*` and `client/src/components/insights/charts/*`.
- No `build.rollupOptions` / `manualChunks` config exists yet (check `client/vite.config.ts`).

## Decisions made (agreed with user, 2026-06-19)

1. **Do this as a separate change**, not part of the Insights merge. Insights merges first.
2. Scope is **performance/bundle only** — no behavior changes, no UI changes. Pure refactor;
   the full test suite (unit + integration + e2e) must stay green and the app must look/behave
   identically.
3. Keep it low-risk and incremental.

## Recommended approach (for whoever picks this up)

Two complementary, independently-shippable steps — do them in this order, verify after each:

1. **Route-level lazy loading.** Convert page imports in `client/src/App.tsx` to
   `React.lazy(() => import('@/pages/X'))` and wrap `<Routes>` in a `<Suspense fallback={…}>`
   (reuse an existing skeleton/spinner from `client/src/components/skeletons/` if suitable).
   This splits each route into its own chunk and pulls Recharts out of the initial load for
   routes that don't use it. Biggest win for least risk.

2. **Manual vendor chunking (optional, if still warning).** In `client/vite.config.ts` add
   `build.rollupOptions.output.manualChunks` to split large vendors (e.g. `recharts`,
   `react`/`react-dom`, `@tanstack/react-query`) into separate chunks for better caching.

Consider whether to raise/keep `build.chunkSizeWarningLimit` — prefer fixing over silencing,
but a modest bump is acceptable once chunks are reasonably split.

## Acceptance criteria

- [ ] `npm run build` no longer emits the >500 kB chunk warning (or initial chunk is
      materially smaller — target initial gzip well under ~318 kB; Recharts not in the entry chunk).
- [ ] App still loads and navigates correctly across all routes (lazy chunks resolve, no flashes
      of broken UI beyond the intended Suspense fallback).
- [ ] `cd client && npx tsc --noEmit` clean.
- [ ] Full suite green: `cd server && npm test && npm run test:integration` and root `npm run test:e2e`.
- [ ] No functional/visual changes.

## Notes

- Per repo memory: only commit/push/merge when the suite is green; `main` auto-deploys to prod.
  Do this on a dedicated branch off `main` and verify before merging.
- This file is the single source of truth for the task; update its Status when picked up/done.

# CLAUDE.md — Agent Operating Guide

This file is the entry point for any AI agent (or human) working in this repo. Read it
first every session. It tells you what the project is, how to work in it safely, and where
everything lives. Keep it current: when a rule, command, or convention changes, update it here.

---

## 1. What this is

**Poker Tracker Pro** — a full-stack web app for tracking home poker games: groups, players,
sessions (historical + live), settlements, statistics, and the **Insights** narrative area
(records, rivalries, form, season recap).

**Product north star:** this is a *home poker game app* for a recurring friend group — social,
fun, bragging-rights oriented. It is **NOT** a debt tracker and **NOT** a grinder/bankroll tool.
See [docs/DECISIONS.md](docs/DECISIONS.md) for the standing product decisions that follow from this.

Deployed on Railway; **`main` auto-deploys to production on push.**

---

## 2. Golden rules (do not violate)

1. **Green before merge/push.** Only commit/push/merge when the full suite is green. `main`
   auto-deploys to prod, so a red push ships a broken prod. Run the suite (§5) first.
2. **Never work directly on `main`.** Branch off `main` for any change (`feat/…`, `fix/…`,
   `docs/…`, `chore/…`). Merge with `--no-ff`, re-verify the suite on the merged result, then
   push only when the user asks.
3. **Push = production deploy.** Pushing `main` is an outward-facing, hard-to-reverse action.
   Confirm with the user before pushing unless they've already said to.
4. **Don't touch money/settlement logic casually.** `settlementService`, buy-in/cash-out math,
   and zero-sum validation are correctness-critical and covered by tests. Changes there need
   tests and care.
5. **TDD for logic.** Write the failing test first for any computation/business logic, watch it
   fail, implement minimally, watch it pass. Pure functions over DB-coupled code where possible.

---

## 3. Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, React Router v7, TanStack Query, Tailwind, shadcn/ui, Recharts, cmdk, sonner |
| Backend | Node 20, Express, TypeScript, Prisma ORM |
| DB | PostgreSQL (prod + local test DBs); schema in `server/prisma/schema.prisma` |
| Tests | Vitest (unit + integration), Playwright (e2e) |
| Hosting | Railway (auto-deploy from `main`); CI in `.github/workflows/ci.yml` |

---

## 4. Repo map

```
client/                     React SPA
  src/pages/                Route pages (Dashboard, Sessions, Insights, …)
  src/components/           UI; feature-grouped (insights/, analytics/, live/, session/, ui/, …)
  src/hooks/                TanStack Query hooks (useStats, useInsights, …)
  src/lib/api.ts            Axios API client (one object per resource: groupsApi, statsApi, insightsApi, …)
  src/types/index.ts        Shared frontend types (mirror server types)
  src/context/              GroupContext (selected group), RoleProvider (VIEWER/EDITOR)
server/
  src/routes/               Express routers (one per resource)
  src/controllers/          Thin request handlers; delegate to services
  src/services/             Business logic (statsService, insightsService, settlementService, …)
  src/utils/calculations.ts Shared pure math (calculateProfit, calculateStreak, round, …)
  src/types/                Backend types
  prisma/schema.prisma      DB schema + migrations/ + seed.ts
  tests/integration/        Supertest API tests (real test DB)
e2e/                        Playwright specs + helpers.ts (seedGroup, selectGroupInBrowser)
docs/
  superpowers/specs/        Design specs (one per feature)
  superpowers/plans/        Implementation plans (one per feature)
  follow-ups/               Tracked deferred work, each self-contained & pickup-cold
  DECISIONS.md              Product/architecture decision log
CLAUDE.md                   This file
CHANGELOG.md                What shipped, newest first
BACKLOG.md                  Prioritized future work
DOCS.md                     Detailed project/feature/API reference
README.md                   Public-facing overview + quick start
```

---

## 5. Commands

**Install:** `npm run install:all`

**Dev:** `npm run dev` (client :5173 + server :3001). Client-only `npm run dev:client`; server-only `npm run dev:server`.

**The full verification suite (run before any merge/push):**
```bash
cd server && npm test                 # unit (Vitest)
cd server && npm run test:integration # integration (needs poker_tracker_test DB)
cd client && npx tsc --noEmit         # client typecheck
cd client && npm test                 # client unit tests (CI runs this too)
npm run test:e2e                       # builds prod artifact + Playwright (needs poker_tracker_e2e DB)
```

**Quick checks:** server typecheck `cd server && npx tsc --noEmit`; client build `cd client && npm run build`.

**DB:** `npm run db:migrate`, `npm run db:seed`, `npm run db:studio`, `npm run db:generate`.

### Local test databases (Postgres on localhost:5432)
- Integration: `poker_tracker_test` (override `TEST_DATABASE_URL`). Wiped per-test.
- E2E: `poker_tracker_e2e` (override `E2E_DATABASE_URL`). Truncated once before the suite.
- Both have safety guards that refuse to run unless the URL name matches. Create them once:
  `createdb poker_tracker_test && createdb poker_tracker_e2e`, then
  `cd server && DATABASE_URL=<url> npx prisma migrate deploy` for each.

CI (`.github/workflows/ci.yml`) runs the whole suite on every PR and push to `main`.

---

## 6. Conventions

- **Components:** arrow-function components, default export, feature-grouped folders.
- **Data fetching:** TanStack Query hooks in `client/src/hooks/`, `enabled: !!groupId`, query keys
  namespaced by domain (`['insights', 'records', groupId]`). Mutations invalidate relevant keys
  and toast via `sonner`.
- **Backend shape:** route → controller (thin, try/catch → `next(error)`) → service (logic) →
  Prisma. Always exclude soft-deleted sessions (`deletedAt: null`).
- **Computations:** prefer exported pure functions that take already-fetched rows, with a thin
  service method that fetches and delegates (see `insightsService.ts`). Makes them unit-testable
  without a DB.
- **Types:** define on the server, mirror exactly in `client/src/types/index.ts`.
- **Money:** use helpers in `server/src/utils/calculations.ts`; round with `round()`.
- **Commits:** conventional prefixes (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), scoped where
  useful (`feat(insights): …`). Small, frequent commits.

---

## 7. How to add a feature (standard workflow)

1. **Spec** → `docs/superpowers/specs/YYYY-MM-DD-<name>-design.md` (brainstorm first).
2. **Plan** → `docs/superpowers/plans/YYYY-MM-DD-<name>.md` (bite-sized TDD tasks).
3. **Branch** off `main`.
4. **Implement** task-by-task, committing after each green step.
5. **Verify** the full suite (§5) — must be green.
6. **Merge** `--no-ff` into `main`, re-verify on the merged result.
7. **Push** (deploys to prod) — confirm with the user first.
8. **Update docs:** `CHANGELOG.md` (always), `BACKLOG.md` (move/remove the item), `DOCS.md`/`README.md`
   if user-facing, `docs/DECISIONS.md` if a notable decision was made.

---

## 8. The documentation system (keep these current)

- **CHANGELOG.md** — append an entry every time something ships. Newest first.
- **BACKLOG.md** — the single prioritized list of future work. Pull from here when asked "what's next".
- **docs/DECISIONS.md** — append when a product/architecture decision is made or reversed.
- **docs/follow-ups/** — deferred work, one file each, written to be actioned with zero prior context.
- **DOCS.md** — deeper reference (architecture, full API, stats formulas). Update when behavior changes.

If you (the agent) learn something durable about how the user wants you to work, also persist it to
your private memory (`~/.claude/.../memory/`), not just here.

# Banter Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship The Belt, night titles, achievements/trophy case, and a Copy-for-WhatsApp settlement message — all derived-on-read, zero schema changes.

**Architecture:** New `banterService.ts` mirrors the `insightsService.ts` pattern: exported pure functions over fetched rows + thin fetch-and-delegate methods; two new read-only `/stats` endpoints; night titles injected into the existing session-summary response. Client mirrors types, adds hooks per `useInsights` conventions, and renders cards on Insights / PlayerDetail / SettlementView / SessionDetail.

**Tech Stack:** Express + Prisma (read-only), Vitest, React + TanStack Query + shadcn/ui, Playwright.

**Spec (authoritative rules & tie-breaks):** `docs/superpowers/specs/2026-07-12-banter-pack-design.md` — read it first; every rule, threshold, and tie-break there is binding.

---

## Shared type contract (server `server/src/types/banter.ts`, mirrored EXACTLY in `client/src/types/index.ts`)

```ts
export type NightTitleId = 'shark' | 'donation' | 'atm' | 'houdini';
export interface NightTitle { id: NightTitleId; label: string; emoji: string; playerId: string; playerName: string; }

export interface BeltReign {
  playerId: string; playerName: string;
  fromDate: string;            // ISO date of the session where the reign began
  toDate: string | null;       // ISO date reign ended (session lost), null = current
  nightsHeld: number;          // completed sessions from reign start through reign end (inclusive) in which the belt existed
  defenses: number;            // nights the holder played and retained
  takenFromPlayerName: string | null; // null for the first champion
}
export interface BeltLineage { current: BeltReign | null; history: BeltReign[]; totalTitleChanges: number; }

export type AchievementId =
  | 'hat-trick' | 'comeback-kid' | 'phoenix' | 'giant-slayer' | 'iron-man'
  | 'regular' | 'veteran' | 'rebuy-royalty' | 'double-up' | 'untouchable';
export interface EarnedAchievement { id: AchievementId; name: string; emoji: string; description: string; earnedAt: string; sessionId: string; }
export interface PlayerAchievements { playerId: string; playerName: string; earned: EarnedAchievement[]; }
export interface AchievementsResponse {
  players: PlayerAchievements[];
  recentUnlocks: (EarnedAchievement & { playerId: string; playerName: string })[]; // newest first, cap 10
  catalog: { id: AchievementId; name: string; emoji: string; description: string }[]; // all 10, for greyed silhouettes
}
```

Input row shape for the pure functions (matches what `insightsService` fetches):
`Session { id, date, createdAt, status, deletedAt, entries: [{ playerId, buyIn, cashOut, player: { name } }], rebuyEvents: [{ playerId, amount }] }`.
Profit = `round(cashOut - buyIn)` via `server/src/utils/calculations.ts`.

---

### Task 1: Pure computations — `banterService.ts` (TDD)

**Files:**
- Create: `server/src/services/banterService.ts`
- Create: `server/src/services/banterService.test.ts`
- Create: `server/src/types/banter.ts` (types above)

- [ ] **Step 1: Write failing unit tests** for the three pure functions. Required cases:
  - `computeNightTitles(session)`: shark = top positive profit; no shark when all ≤ 0; donation only when negative; ATM needs ≥2 rebuys; houdini = positive profit with ≥2 rebuys; one player can hold multiple titles; every tie-break from the spec table (profit tie → fewest rebuys → name asc; ATM tie → highest rebuy $ → name asc).
  - `computeBeltLineage(sessions)`: empty input → `current: null`; first champion = first session's top profit with tie-breaks; defense when holder plays and no one strictly beats them (tie = defense); takeover by highest strict beater; belt NOT at stake when holder absent (`nightsHeld` still increments, `defenses` does not); sessions sorted by date then createdAt; excludes non-COMPLETED and `deletedAt != null`; `totalTitleChanges = history.length` (reigns after the first).
  - `computeAchievements(sessions)`: one earned/not-earned boundary test per badge (e.g. hat-trick at exactly 3 straight wins, not 2; comeback-kid win after exactly 3 losses; iron-man 10 consecutive *group* sessions vs a gap; regular at 25th game; double-up profit ≥ 2× night buy-in; giant-slayer vs the all-time leader *entering* that session, leader ≠ self; untouchable held by exactly one player and transfers when the record breaks; rebuy-royalty at 25 career rebuys; phoenix positive with ≥3 rebuys). `earnedAt`/`sessionId` = first qualifying session. Break-even (profit 0) is neither win nor loss.
- [ ] **Step 2:** `cd server && npm test` → new file FAILS (functions undefined).
- [ ] **Step 3:** Implement the three pure functions per spec. Belt core:

```ts
export function computeBeltLineage(sessions: BanterSessionRow[]): BeltLineage {
  const ordered = sessions
    .filter(s => s.status === 'COMPLETED' && !s.deletedAt)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date) || +new Date(a.createdAt) - +new Date(b.createdAt));
  // profit/tiebreak helper: [-profit, rebuyCount, name] ascending
  // first session -> first reign; then per session: holder played?
  //   challengers = entries with profit > holderProfit; if any -> close reign (toDate), push, start new
  //   else defenses++; nightsHeld++ regardless of holder presence once belt exists
}
```

  Achievements: iterate sessions in the same order once, maintaining per-player running state (streaks, games, rebuys, attendance run, all-time balances for giant-slayer/untouchable). Keep it one pass where possible; clarity over cleverness.
- [ ] **Step 4:** `cd server && npm test` → all green.
- [ ] **Step 5:** Commit `feat(banter): pure belt/titles/achievements computations`.

### Task 2: Service fetch methods, endpoints, summary titles (TDD)

**Files:**
- Modify: `server/src/services/banterService.ts` (add `getBelt(groupId)`, `getAchievements(groupId)` — fetch rows exactly like `insightsService` does, delegate to pure fns)
- Modify: `server/src/services/statsService.ts` (`getSessionSummary` result gains `titles` via `computeNightTitles`)
- Modify: `server/src/controllers/statsController.ts`, `server/src/routes/stats.ts` (`GET /groups/:groupId/belt`, `GET /groups/:groupId/achievements` — thin, try/catch → `next(error)`)
- Create: `server/tests/integration/banter.test.ts`

- [ ] **Step 1: Failing integration tests** (follow `leaderboardTimeframe.test.ts` style): belt with seeded 3-session takeover/defense scenario; achievements response shape incl. `catalog` of 10; empty group → `current: null`, empty players; session summary includes `titles`.
- [ ] **Step 2:** `npm run test:integration` → new file fails.
- [ ] **Step 3:** Implement; **Step 4:** unit + integration + `npx tsc --noEmit` all green.
- [ ] **Step 5:** Commit `feat(banter): belt & achievements endpoints, night titles in summary`.

### Task 3: Client data layer

**Files:**
- Modify: `client/src/types/index.ts` (mirror the shared contract verbatim)
- Modify: `client/src/lib/api.ts` (`insightsApi.getBelt(groupId)`, `insightsApi.getAchievements(groupId)`)
- Modify: `client/src/hooks/useInsights.ts` (`useBelt`, `useAchievements`; keys `['insights','belt',groupId]`, `['insights','achievements',groupId]`, `enabled: !!groupId`)

- [ ] Implement, then `cd client && npx tsc --noEmit` clean. Commit `feat(banter): client types, api, hooks`.

### Task 4: Insights cards + trophy case + unlock toast

**Files:**
- Create: `client/src/components/insights/BeltCard.tsx` (holder, reign nights/defenses, "took it from X", collapsible lineage; match existing insights card styling)
- Create: `client/src/components/insights/RecentUnlocks.tsx`
- Modify: `client/src/pages/Insights.tsx` (render both)
- Create: `client/src/components/players/TrophyCase.tsx` (earned lit with date; unearned greyed from `catalog`; grid of badge tiles)
- Modify: `client/src/pages/PlayerDetail.tsx` (TrophyCase section + unlock toast: on achievements load, badge keys not in localStorage `bp_seen_<groupId>_<playerId>_<badgeId>` → `toast('🏆 New achievement: …')`, then mark seen)

- [ ] Implement; `npx tsc --noEmit` + `npm test` + `npm run build` green. Commit `feat(banter): belt card, recent unlocks, trophy case`.

### Task 5: Night-title chips + WhatsApp copy (TDD on formatter)

**Files:**
- Create: `client/src/lib/nightMessage.ts` — `formatNightMessage(input: { date: string; currency: string; results: { name: string; profit: number; titles: NightTitle[] }[]; settlements: Settlement[]; belt?: { line: string } }): string` — exact layout per spec example; sections omitted when empty.
- Create: `client/src/lib/nightMessage.test.ts` (full data, no titles, no belt line, empty settlements)
- Modify: `client/src/pages/SettlementView.tsx`, `client/src/pages/SessionDetail.tsx` (title chips near results; "Copy for WhatsApp" button → `navigator.clipboard.writeText` + sonner toast). Belt line on SettlementView: compare belt holder before/after via `useBelt` data (if current reign's `fromDate` equals this session's date → "takes The Belt from X", else if holder played → "defends (Nth defense)", else omit).

- [ ] TDD the formatter, wire the UI; client suite green. Commit `feat(banter): night title chips + WhatsApp copy`.

### Task 6: E2E + docs

**Files:**
- Create: `e2e/banter.spec.ts` (seed via `e2e/helpers.ts`; assert Belt card renders a holder on Insights; trophy case grid renders on a player page; Copy button visible on a completed session's settlement area)
- Modify: `CHANGELOG.md`, `BACKLOG.md` (nothing to remove — new work), `docs/WORKLOG.md`, `DOCS.md` (new endpoints)

- [ ] E2E green via `npm run test:e2e`; docs updated. Commit `test(banter): e2e + docs`.

---

**Verification gate before merge:** full suite (server unit + integration, client tsc/tests/build, e2e) green on the branch, merge `--no-ff`, re-verify, push only with standing user authorization (granted for this pack: "through to a verified, deployed release").

**Self-review done:** spec sections all covered by Tasks 1–6; no placeholders; type names consistent across tasks.

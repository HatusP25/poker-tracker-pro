# Banter Pack — Design Spec

**Date:** 2026-07-12
**Status:** Approved by user (belt rule + architecture confirmed via Q&A)
**Product fit:** Pure bragging-rights features for the home group (north star; DECISIONS D-001/D-002 respected — no money-owed features, no grinder metrics).

## Non-negotiable constraint

**Never alter existing production data.** This pack is 100% derived-on-read from existing
models (`Session`, `SessionEntry`, `RebuyEvent`, `Player`): **no schema changes, no
migrations, no new write paths to session data.** Rationale (user-ratified): session
history is mutable (edits, rebuy corrections, soft delete/restore, reopen), so persisted
derived state could silently disagree with corrected history — recompute-on-read cannot.
Tables remain the right tool for *user-created* facts (predictions, RSVPs) — future work,
not this pack.

## Features

### 1. The Belt 🥇

A symbolic championship belt with retroactively computed lineage over the group's full history.

**Rules (user-selected: "beat the champ head-to-head"):**
- Consider only sessions with `status = COMPLETED` and `deletedAt = null`, ordered by
  `date` asc, tie-broken by `createdAt` asc.
- The first session's top profiteer is the first champion.
- In each later session: if the current holder has an entry, the belt is at stake.
  Challengers are players with `profit > holder's profit` that night. If any exist, the
  new holder is the challenger with the highest profit; otherwise the holder records a
  **defense**. If the holder did not play, the belt is not at stake.
- All profit ties / tie-breaks: highest profit → fewest rebuys that night → player name asc.
- Because it recomputes from source, lineage self-heals when history is corrected.

**API:** `GET /api/stats/groups/:groupId/belt` →
```ts
interface BeltReign { playerId; playerName; fromDate; toDate | null; nightsHeld; defenses; takenFromPlayerName | null; }
interface BeltLineage { current: BeltReign | null; history: BeltReign[]; totalTitleChanges: number; }
```
`current: null` when the group has no completed sessions.

**UI:** Belt card on `/insights` (holder, reign length, defenses, "at stake next time X plays"),
expandable full lineage list. Follows existing insights card patterns.

### 2. Night Titles

Computed within the existing session summary (`getSessionSummary`); response gains a
`titles: NightTitle[]` field. A player may hold multiple titles in one night.

| Title | Rule | Tie-break |
|---|---|---|
| 🦈 Shark of the Night | max profit, only if > 0 | fewest rebuys → name asc |
| 💸 Donation of the Night | min profit, only if < 0 | most rebuys → name asc |
| 🏧 ATM | most rebuys, min 2 | highest rebuy $ total → name asc |
| 🎩 Houdini | profit > 0 with ≥ 2 rebuys (highest such profit) | fewest rebuys → name asc |

**UI:** chips on `SettlementView` and the `SessionDetail` header area.

### 3. Achievements / Trophy Case

`GET /api/stats/groups/:groupId/achievements` → per-player earned badges with
`earnedAt` (date of first qualifying session) + `sessionId`, plus a `recentUnlocks` list
(most recent earned badges group-wide, newest first).

Definitions: **win** = profit > 0, **loss** = profit < 0; "consecutive" means across the
sessions *that player attended*, except Iron Man (consecutive group sessions). All
thresholds are relative or count-based — no absolute dollar amounts (stake-agnostic).

| Badge | Rule |
|---|---|
| 🎩 Hat Trick | 3 consecutive wins |
| 🃏 Comeback Kid | a win immediately after ≥3 consecutive losses |
| 🔥 Phoenix | a positive night with ≥3 rebuys |
| ⚔️ Giant Slayer | out-profit the all-time balance leader (entering that session) in a night they played (leader ≠ self) |
| 🛡️ Iron Man | attended 10 consecutive group sessions |
| 📅 Regular | 25 sessions played |
| 🏛️ Veteran | 50 sessions played |
| 👑 Rebuy Royalty | 25 career rebuys |
| 💰 Double-Up | night profit ≥ 2× that night's total buy-in |
| 🎯 Untouchable | current holder of the biggest single-night profit in group history (transferable — exactly one holder, can be lost) |

**UI:**
- **Trophy case** on `PlayerDetail`: earned badges lit with earned date; unearned shown as
  greyed silhouettes (something to chase). VIEWER/EDITOR identical (read-only feature).
- **Recent unlocks** card on `/insights`.
- **Unlock celebration:** client-side only — a localStorage set of seen badge keys
  (`bp_seen_<groupId>_<playerId>_<badgeId>`); when achievements load containing an unseen
  earned badge, fire a sonner toast ("🏆 New achievement: …"). No new dependencies, no
  persistence server-side.

### 4. Copy-for-WhatsApp settlement message

Pure client formatter `formatNightMessage(...)` in `client/src/lib/` + a copy button on
`SettlementView` and the `SessionDetail` settlement card (`navigator.clipboard.writeText`
+ toast). Example output:

```
🃏 Poker Night — Fri Jul 10
🦈 Marcus +$120
    Dani +$15
    Alex -$40
💸 Pete -$95 (Donation of the Night)

💰 Settle up:
Pete → Marcus $95
Alex → Marcus $25
Alex → Dani $15

🥇 The Belt: Marcus defends (4th defense)
```

Sections render only when data exists (titles, belt line optional). Currency symbol from
group settings.

## Architecture

- **Server:** new `banterService.ts` alongside `insightsService.ts`, same shape: exported
  pure functions (`computeBeltLineage(sessions)`, `computeAchievements(sessions)`,
  `computeNightTitles(entries, rebuys)`) + thin fetch-and-delegate methods. Two new routes
  in `routes/stats.ts` + thin controllers. Night titles wired into the existing
  `getSessionSummary` path. Types in `server/src/types/`, mirrored exactly in
  `client/src/types/index.ts`.
- **Client:** hooks following `useInsights.ts` conventions (`['insights','belt',groupId]`,
  `['insights','achievements',groupId]`, `enabled: !!groupId`); new components under
  `client/src/components/insights/` (BeltCard, RecentUnlocks) and
  `client/src/components/players/TrophyCase.tsx`; formatter + tests in `client/src/lib/`.
- **No new dependencies. No schema changes. Read-only endpoints only.**

## Testing

TDD throughout. Unit: belt lineage (first-champion, defense, takeover, holder-absent,
tie-breaks, soft-delete exclusion), each badge rule (earned/not-earned boundary),
night-title rules, WhatsApp formatter (full/partial data). Integration: both new endpoints
+ summary `titles` field. E2E: belt card + trophy case render on seeded data. Full suite
green before merge; `main` push = production deploy per CLAUDE.md.

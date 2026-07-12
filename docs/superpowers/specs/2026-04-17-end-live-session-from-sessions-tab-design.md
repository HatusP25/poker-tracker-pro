# Design: End Live Session from Sessions Tab

**Date:** 2026-04-17  
**Status:** Approved

## Problem

Live sessions (status = `IN_PROGRESS`) are sometimes abandoned and never properly ended. The only way to end them is to navigate into the live session view. This feature adds a shortcut directly from the Sessions tab so users can end a stuck session without extra navigation.

## Solution Overview

Add an action strip to live `SessionCard`s with two buttons:
1. **End Session** — navigates to the live session view with `?autoEnd=true` query param, which auto-opens the existing `EndSessionDialog`
2. **Force End** — shows a confirmation dialog, then force-closes the session (no cash-out data required)

## Architecture

### Frontend

**`SessionCard.tsx`**
- For `isLive` sessions, render an action strip below the existing card content (separated by a top border)
- "End Session" button: calls `onEndSession(session.id)` prop (outlined, green-tinted) — stops click propagation so the card's own `onClick` doesn't also fire
- "Force End" button: small ghost/destructive button — stops propagation, opens a local `AlertDialog` for confirmation (dialog open/close state lives inside `SessionCard`); on confirm, calls `onForceEnd(session.id)` prop

**`Sessions.tsx`**
- Passes `onEndSession` callback: `(id) => navigate(\`/live/\${id}?autoEnd=true\`)`
- Wires up `useForceEndSession` mutation and passes `onForceEnd={(id) => forceEnd(id)}` to each live card
- Data logic stays in `Sessions.tsx`; `SessionCard` only owns confirmation dialog UI state

**`LiveSessionView.tsx`**
- On mount, reads `useSearchParams()` for `autoEnd=true`
- If present, sets `showEndDialog = true` immediately (the existing `EndSessionDialog` opens automatically)

### Backend

**New endpoint:** `POST /api/live-sessions/:sessionId/force-end`

**Service method** (`liveSessionService.forceEndSession`):
- Validates session exists and is `IN_PROGRESS`
- Sets `status = "COMPLETED"`, `endTime` = current HH:MM time
- Leaves `cashOut` values at 0 for all entries
- Sets `settlements = []` (empty — no zero-sum data to calculate)
- Does NOT validate cash-out amounts

**Controller:** `forceEndLiveSession` in `liveSessionsController.ts`

**Client hook:** `useForceEndSession` in `useLiveSessions.ts`
- Calls `liveSessionsApi.forceEnd(sessionId)`
- Invalidates `sessions`, `live-session`, and `live-sessions` queries
- Shows success toast: "Session force ended"

**API client:** Add `forceEnd(sessionId)` to `liveSessionsApi` in `api.ts`

## Data Flow

```
Sessions tab (live card)
  └─ "End Session" clicked
       └─ navigate(`/live/${id}?autoEnd=true`)
            └─ LiveSessionView mounts, detects autoEnd param
                 └─ setShowEndDialog(true) → EndSessionDialog opens

Sessions tab (live card)
  └─ "Force End" clicked
       └─ AlertDialog confirmation shown
            └─ User confirms
                 └─ POST /api/live-sessions/:id/force-end
                      └─ status→COMPLETED, endTime=now, settlements=[]
                           └─ Queries invalidated, toast shown
```

## Files to Change

| File | Change |
|------|--------|
| `client/src/components/sessions/SessionCard.tsx` | Add action strip + ForceEnd AlertDialog for live sessions |
| `client/src/pages/Sessions.tsx` | Add `useForceEndSession`, pass `onEndSession`/`onForceEnd` to cards |
| `client/src/pages/LiveSessionView.tsx` | Read `?autoEnd` param, auto-open EndSessionDialog |
| `client/src/hooks/useLiveSessions.ts` | Add `useForceEndSession` hook |
| `client/src/lib/api.ts` | Add `forceEnd(sessionId)` to `liveSessionsApi` |
| `server/src/routes/liveSessions.ts` | Add `POST /:sessionId/force-end` route |
| `server/src/controllers/liveSessionsController.ts` | Add `forceEndLiveSession` controller |
| `server/src/services/liveSessionService.ts` | Add `forceEndSession` method |

## Verification

1. Start a live session
2. Go to Sessions tab — live card shows "End Session" and "Force End" buttons
3. Click "End Session" → navigates to live view, EndSessionDialog auto-opens with cash-out fields
4. Complete the dialog → session ends normally
5. Start another live session, go to Sessions tab
6. Click "Force End" → confirmation dialog appears with warning
7. Confirm → session disappears from live list, shows as completed in sessions list (no winner/settlements shown)
8. Verify card `onClick` still navigates to session when clicking anywhere else on the card

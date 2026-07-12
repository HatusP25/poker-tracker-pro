# End Live Session from Sessions Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users end a stuck live session directly from the Sessions tab — either via a proper End Session flow (navigates to live view and auto-opens the cash-out dialog) or a Force End (no cash-outs required, just marks it done).

**Architecture:** Action strip added to live `SessionCard`s with two buttons. "End Session" navigates to `/live/:id?autoEnd=true`; `LiveSessionView` detects the param and auto-opens `EndSessionDialog`. "Force End" shows an inline `AlertDialog` confirmation then calls a new `POST /live-sessions/:id/force-end` endpoint that bypasses cash-out validation. All data logic lives in `Sessions.tsx`; `SessionCard` only owns the confirmation dialog UI state.

**Tech Stack:** React + TypeScript (Vite), React Query (TanStack), React Router v6, shadcn/ui, Express + Prisma (server)

---

## File Map

| File | Change |
|------|--------|
| `server/src/services/liveSessionService.ts` | Add `forceEndSession` method |
| `server/src/controllers/liveSessionController.ts` | Add `forceEndLiveSession` controller |
| `server/src/routes/liveSessions.ts` | Register `POST /:sessionId/force-end` route |
| `client/src/lib/api.ts` | Add `forceEnd` method to `liveSessionsApi` |
| `client/src/hooks/useLiveSessions.ts` | Add `useForceEndSession` hook |
| `client/src/components/sessions/SessionCard.tsx` | Add action strip + ForceEnd AlertDialog |
| `client/src/pages/Sessions.tsx` | Wire up `useForceEndSession`, pass new props to `SessionCard` |
| `client/src/pages/LiveSessionView.tsx` | Read `?autoEnd` param, auto-open EndSessionDialog on mount |

---

## Task 1: Backend — `forceEndSession` service method

**Files:**
- Modify: `server/src/services/liveSessionService.ts`

- [ ] **Step 1: Add the `forceEndSession` method to `liveSessionService`**

Open `server/src/services/liveSessionService.ts`. After the closing `}` of the `endSession` method (around line 298), add the following method inside the class:

```typescript
/**
 * Force-end a live session without recording cash-outs or settlements.
 * Used as a last resort when a session is stuck in IN_PROGRESS.
 */
async forceEndSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'IN_PROGRESS') {
    throw new Error('Session is not in progress');
  }

  // Get current local time as HH:MM string
  const now = new Date();
  const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const updatedSession = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      endTime,
      settlements: JSON.stringify([]),
    },
    include: {
      entries: {
        include: {
          player: true,
        },
      },
    },
  });

  return { session: updatedSession, settlements: [] };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hatuspellegrini/Documents/Personal/pokerapp/server
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/liveSessionService.ts
git commit -m "feat: add forceEndSession service method"
```

---

## Task 2: Backend — Controller + Route

**Files:**
- Modify: `server/src/controllers/liveSessionController.ts`
- Modify: `server/src/routes/liveSessions.ts`

- [ ] **Step 1: Add `forceEndLiveSession` controller**

Open `server/src/controllers/liveSessionController.ts`. After the closing `}` of the `getActiveSessions` function (end of file), add:

```typescript
export const forceEndLiveSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const result = await liveSessionService.forceEndSession(sessionId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Register the route**

Open `server/src/routes/liveSessions.ts`.

Add `forceEndLiveSession` to the import line:

```typescript
import {
  startLiveSession,
  getLiveSession,
  addRebuy,
  addPlayer,
  endLiveSession,
  reopenLiveSession,
  getActiveSessions,
  forceEndLiveSession,
} from '../controllers/liveSessionController';
```

Then add the new route after the existing `end` route:

```typescript
// Force-end session without cash-outs (emergency use)
router.post('/:sessionId/force-end', forceEndLiveSession);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/hatuspellegrini/Documents/Personal/pokerapp/server
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Manual smoke test — force-end endpoint**

Start the server (`npm run dev` in the `server` directory). With a live session ID in hand, run:

```bash
curl -s -X POST http://localhost:3001/api/live-sessions/<SESSION_ID>/force-end \
  -H "Content-Type: application/json" | jq '.session.status'
```

Expected output: `"COMPLETED"`

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/liveSessionController.ts server/src/routes/liveSessions.ts
git commit -m "feat: add force-end controller and route"
```

---

## Task 3: Frontend — API client method

**Files:**
- Modify: `client/src/lib/api.ts`

- [ ] **Step 1: Add `forceEnd` to `liveSessionsApi`**

Open `client/src/lib/api.ts`. Inside the `liveSessionsApi` object (after the `reopen` entry, around line 176), add:

```typescript
forceEnd: (sessionId: string) =>
  api.post(`/live-sessions/${sessionId}/force-end`, {}),
```

The object should now look like:

```typescript
export const liveSessionsApi = {
  start: (...) => ...,
  get: (...) => ...,
  addRebuy: (...) => ...,
  addPlayer: (...) => ...,
  end: (...) => ...,
  reopen: (...) => ...,
  forceEnd: (sessionId: string) =>
    api.post(`/live-sessions/${sessionId}/force-end`, {}),
  getActive: (...) => ...,
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hatuspellegrini/Documents/Personal/pokerapp/client
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/api.ts
git commit -m "feat: add forceEnd method to liveSessionsApi"
```

---

## Task 4: Frontend — `useForceEndSession` hook

**Files:**
- Modify: `client/src/hooks/useLiveSessions.ts`

- [ ] **Step 1: Add the hook**

Open `client/src/hooks/useLiveSessions.ts`. After the closing `};` of `useEndLiveSession` (around line 98), add:

```typescript
export const useForceEndSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => liveSessionsApi.forceEnd(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Session force ended');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to force end session');
    },
  });
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hatuspellegrini/Documents/Personal/pokerapp/client
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useLiveSessions.ts
git commit -m "feat: add useForceEndSession hook"
```

---

## Task 5: Frontend — SessionCard action strip

**Files:**
- Modify: `client/src/components/sessions/SessionCard.tsx`

- [ ] **Step 1: Replace the full `SessionCard` component**

Replace the entire contents of `client/src/components/sessions/SessionCard.tsx` with:

```tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, MapPin, Users, TrendingUp, Radio, StopCircle } from 'lucide-react';
import { parseLocalDate } from '@/lib/dateUtils';
import type { Session } from '@/types';

interface SessionCardProps {
  session: Session;
  onClick: () => void;
  onEndSession?: (sessionId: string) => void;
  onForceEnd?: (sessionId: string) => void;
}

const SessionCard = ({ session, onClick, onEndSession, onForceEnd }: SessionCardProps) => {
  const [showForceEndConfirm, setShowForceEndConfirm] = useState(false);

  const totalBuyIn = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;
  const playerCount = session.entries?.length || 0;
  const isLive = session.status === 'IN_PROGRESS';

  // Find winner (player with highest profit)
  const winner = session.entries?.reduce((max, entry) => {
    const profit = entry.cashOut - entry.buyIn;
    const maxProfit = max ? max.cashOut - max.buyIn : -Infinity;
    return profit > maxProfit ? entry : max;
  }, session.entries?.[0]);

  const winnerProfit = winner ? winner.cashOut - winner.buyIn : 0;

  const formattedDate = format(parseLocalDate(session.date), 'MMM dd, yyyy');
  const formattedTime = session.startTime
    ? `${session.startTime}${session.endTime ? ` - ${session.endTime}` : ''}`
    : null;

  return (
    <>
      <Card
        className={`cursor-pointer hover:bg-accent/50 transition-colors ${isLive ? 'border-green-500/50 bg-green-500/5' : ''}`}
        onClick={onClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {formattedDate}
                {isLive && (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white ml-1 gap-1">
                    <Radio className="h-3 w-3 animate-pulse" />
                    LIVE
                  </Badge>
                )}
              </CardTitle>
              {formattedTime && (
                <p className="text-sm text-muted-foreground mt-1">{formattedTime}</p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {playerCount} players
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {session.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {session.location}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Total Pot</p>
                <p className="text-lg font-semibold">${totalBuyIn.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isLive ? 'Status' : 'Winner'}
                </p>
                <div className="flex items-center gap-1">
                  {isLive ? (
                    <p className="text-lg font-semibold text-green-500">In Progress</p>
                  ) : (
                    <>
                      <p className="text-lg font-semibold truncate">
                        {winner?.player?.name || 'N/A'}
                      </p>
                      {winnerProfit > 0 && (
                        <span className="text-green-500 text-sm flex items-center">
                          <TrendingUp className="h-3 w-3" />
                          ${winnerProfit.toFixed(0)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {session.notes && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground line-clamp-2">{session.notes}</p>
              </div>
            )}

            {/* Action strip — only shown for live sessions */}
            {isLive && (onEndSession || onForceEnd) && (
              <div
                className="flex items-center gap-2 pt-3 border-t"
                onClick={(e) => e.stopPropagation()}
              >
                {onEndSession && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-green-500/50 text-green-600 hover:bg-green-500/10 hover:text-green-700"
                    onClick={() => onEndSession(session.id)}
                  >
                    <StopCircle className="h-4 w-4 mr-1" />
                    End Session
                  </Button>
                )}
                {onForceEnd && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setShowForceEndConfirm(true)}
                  >
                    Force End
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Force End confirmation dialog — rendered outside the Card to avoid click propagation issues */}
      <AlertDialog open={showForceEndConfirm} onOpenChange={setShowForceEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force end this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately close the session without recording any cash-outs or
              calculating settlements. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onForceEnd?.(session.id);
                setShowForceEndConfirm(false);
              }}
            >
              Force End
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SessionCard;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hatuspellegrini/Documents/Personal/pokerapp/client
npx tsc --noEmit
```

Expected: No errors. If `AlertDialog` is missing, install it:
```bash
npx shadcn@latest add alert-dialog
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/sessions/SessionCard.tsx
git commit -m "feat: add End Session / Force End action strip to live SessionCard"
```

---

## Task 6: Frontend — Wire up `Sessions.tsx`

**Files:**
- Modify: `client/src/pages/Sessions.tsx`

- [ ] **Step 1: Add `useForceEndSession` import and hook call**

Open `client/src/pages/Sessions.tsx`. Add `useForceEndSession` to the existing hooks import line. Find the line that imports from `useSessions` and add a new import nearby:

```typescript
import { useForceEndSession } from '@/hooks/useLiveSessions';
```

Inside the `Sessions` component body (after the existing hooks), add:

```typescript
const forceEndSession = useForceEndSession();
```

- [ ] **Step 2: Pass new props to `SessionCard`**

Find the `SessionCard` usage in the render (around line 211) and update it:

```tsx
<SessionCard
  key={session.id}
  session={session}
  onClick={() => {
    if (session.status === 'IN_PROGRESS') {
      navigate(`/live/${session.id}`);
    } else {
      navigate(`/sessions/${session.id}`);
    }
  }}
  onEndSession={
    session.status === 'IN_PROGRESS'
      ? (id) => navigate(`/live/${id}?autoEnd=true`)
      : undefined
  }
  onForceEnd={
    session.status === 'IN_PROGRESS'
      ? (id) => forceEndSession.mutate(id)
      : undefined
  }
/>
```

> **Note:** The `onClick` handler is also updated so that clicking a live session card navigates to `/live/:id` (the live view) rather than `/sessions/:id` (the detail view), which is consistent with existing behaviour since live sessions redirect from the detail view anyway.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/hatuspellegrini/Documents/Personal/pokerapp/client
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Sessions.tsx
git commit -m "feat: wire up End Session and Force End actions in Sessions page"
```

---

## Task 7: Frontend — Auto-open EndSessionDialog in LiveSessionView

**Files:**
- Modify: `client/src/pages/LiveSessionView.tsx`

- [ ] **Step 1: Read `?autoEnd` param and auto-open dialog**

Open `client/src/pages/LiveSessionView.tsx`.

Add `useSearchParams` to the React Router import:

```typescript
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
```

Inside `LiveSessionView`, after the existing `useParams`/`useNavigate` calls, add:

```typescript
const [searchParams] = useSearchParams();
```

Find the existing `useEffect` hooks. Add a new `useEffect` that fires once on mount to detect the `autoEnd` param:

```typescript
// Auto-open End Session dialog when navigated here with ?autoEnd=true
useEffect(() => {
  if (searchParams.get('autoEnd') === 'true') {
    setShowEndDialog(true);
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

Place this effect after the existing elapsed-time `useEffect`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/hatuspellegrini/Documents/Personal/pokerapp/client
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/LiveSessionView.tsx
git commit -m "feat: auto-open EndSessionDialog when navigated with ?autoEnd=true"
```

---

## Verification

Manual end-to-end test checklist:

- [ ] Start a live session from the app
- [ ] Navigate to the **Sessions** tab — the live card shows **"End Session"** and **"Force End"** buttons at the bottom
- [ ] Click anywhere else on the card body — navigates to the live session view (no dialog auto-open)
- [ ] Click **"End Session"** — navigates to `/live/:id`, `EndSessionDialog` opens automatically with cash-out fields for all players
- [ ] Fill in cash-outs and complete the dialog — session ends normally and appears in the sessions list as completed with winner info
- [ ] Start another live session
- [ ] From the Sessions tab, click **"Force End"** — confirmation `AlertDialog` appears with warning text
- [ ] Click **Cancel** — dialog closes, session remains live
- [ ] Click **"Force End"** again, then confirm — session disappears from live list, appears in sessions list as completed (no winner or settlements shown since cash-outs are 0)
- [ ] Verify a toast "Session force ended" appears on force-end success

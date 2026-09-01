import { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Radio, StopCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { parseLocalDate } from '@/lib/dateUtils';
import { formatCount, formatMoney } from '@/lib/viz';
import type { Session } from '@/types';

/**
 * A night that is happening right now.
 *
 * It used to be card number one in a grid of twenty-three, distinguished by a
 * green tint. But a live night is not an archive entry — it is the only thing
 * on this page you might need in the next ten seconds. It gets pulled out
 * above the archive, with the two actions that matter on it.
 *
 * The green here is chrome (a filled badge with near-black type), never money.
 */

interface LiveNightCardProps {
  session: Session;
  onOpen: () => void;
  onEndSession?: (sessionId: string) => void;
  onForceEnd?: (sessionId: string) => void;
  isForceEndPending?: boolean;
  currency?: string | null;
}

const LiveNightCard = ({
  session,
  onOpen,
  onEndSession,
  onForceEnd,
  isForceEndPending,
  currency,
}: LiveNightCardProps) => {
  const [showForceEndConfirm, setShowForceEndConfirm] = useState(false);

  const pot = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) ?? 0;
  const players = session.entries?.length ?? 0;
  const date = parseLocalDate(session.date);

  return (
    <>
      <Card
        interactive
        onClick={onOpen}
        className="relative overflow-hidden p-5 sm:p-6"
        data-testid="live-night-card"
      >
        {/* A green wash from the top-left corner: this table is lit. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_180px_at_0%_0%,hsl(var(--primary)/0.14),transparent_70%)]"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-display text-caption font-bold uppercase tracking-wider text-primary-foreground">
              <Radio className="h-3 w-3 animate-pulse" aria-hidden />
              Live now
            </span>
            <h2 className="mt-3 font-display text-display-4 font-extrabold tracking-tight">
              {format(date, 'EEEE, MMM d')}
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-muted-foreground tnum">
              {session.startTime && <span>Since {session.startTime}</span>}
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {formatCount(players)} at the table
              </span>
              {session.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {session.location}
                </span>
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="eyebrow">On the table</p>
            <p className="mt-1 font-display text-display-4 font-extrabold tnum">
              {formatMoney(pot, { currency, decimals: 2 })}
            </p>
          </div>
        </div>

        {(onEndSession || onForceEnd) && (
          <div
            className="relative mt-5 flex items-center gap-2 border-t border-border/70 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            {onEndSession && (
              <Button size="sm" onClick={() => onEndSession(session.id)}>
                <StopCircle className="mr-2 h-4 w-4" />
                End Session
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onOpen}>
              Open table
            </Button>
            {onForceEnd && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-muted-foreground hover:text-destructive"
                onClick={() => setShowForceEndConfirm(true)}
              >
                Force End
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Outside the card, so the dialog's clicks never reach the card. */}
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
              disabled={isForceEndPending}
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

export default LiveNightCard;

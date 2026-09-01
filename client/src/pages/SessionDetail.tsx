import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
import {
  ArrowLeft,
  Clock,
  Copy,
  Loader2,
  MapPin,
  MessageCircle,
  Radio,
  RotateCcw,
  SearchX,
  Trash2,
  Users,
} from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { useSession, useDeleteSession, useRestoreSession } from '@/hooks/useSessions';
import { useSessionSummary } from '@/hooks/useSessionSummary';
import { useBelt } from '@/hooks/useInsights';
import BalanceIndicator from '@/components/sessions/BalanceIndicator';
import NightHeadline from '@/components/session/NightHeadline';
import NightResultsBoard from '@/components/session/NightResultsBoard';
import NightStory from '@/components/session/NightStory';
import SettlementList from '@/components/session/SettlementList';
import NightTitleChips from '@/components/session/NightTitleChips';
import { parseLocalDate } from '@/lib/dateUtils';
import { rebuyCountsByPlayer } from '@/lib/nightRebuys';
import { formatCount, formatMoney } from '@/lib/viz';
import { formatNightMessage } from '@/lib/nightMessage';
import { buildNightShareInput, nightCardFilename } from '@/lib/nightShareData';
import { buildNightCardScene } from '@/lib/shareCard';
import { displayName } from '@/lib/displayName';
import ShareCardButton from '@/components/share/ShareCardButton';
import type { Settlement } from '@/types';

/**
 * One night, in full.
 *
 * This page used to be eight bordered blocks in a row — a KPI grid, a title
 * strip, a balance banner, three summary cards, a rebuy log and a table — each
 * given exactly the same weight, two of the four KPI cards a different height
 * from the other two because they stuffed a name *and* a coloured amount into
 * the slot the others used for a short numeral.
 *
 * It is four now, and they are in the order someone actually reads them: what
 * happened (the headline), how it finished (the board), who owes whom (the
 * settlement — the bit that gets screenshotted), and what it meant (the story).
 */

const SessionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useRole();
  const { data: session, isLoading } = useSession(id || '');
  // Use session's actual groupId to avoid mismatch with context's selectedGroup
  const { data: summary, isLoading: summaryLoading } = useSessionSummary(
    id || '',
    session?.groupId || ''
  );
  const { data: belt } = useBelt(session?.groupId || '');
  const deleteSession = useDeleteSession();
  const restoreSession = useRestoreSession();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    if (id) {
      deleteSession.mutate(id, {
        onSuccess: () => {
          navigate('/sessions');
        }
      });
    }
  };

  const handleRestore = () => {
    if (id) {
      restoreSession.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading session" />
      </div>
    );
  }

  if (!session) {
    return (
      <EmptyState
        icon={SearchX}
        title="That night isn't here"
        description="It may have been deleted, or the link is wrong."
        action={
          <Button onClick={() => navigate('/sessions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sessions
          </Button>
        }
      />
    );
  }

  const currency = session.group?.currency;
  // Parse date as local date to avoid timezone issues
  const sessionDate = parseLocalDate(session.date);
  const totalBuyIn = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;
  const totalCashOut = session.entries?.reduce((sum, e) => sum + e.cashOut, 0) || 0;

  // Rebuys come from the night's actual rebuy data — recorded rows first, a
  // reconstruction against the group's own default second (lib/nightRebuys.ts).
  // This used to be `buyIn > 5 ? (buyIn - 5) / 5 : 0`, which hardcoded a $5
  // buy-in and printed fractions.
  const rebuysByPlayer = rebuyCountsByPlayer({
    entries: session.entries || [],
    rebuyEvents: session.rebuyEvents,
    defaultBuyIn: session.group?.defaultBuyIn,
  });

  const entriesWithStats = session.entries?.map((entry) => ({
    ...entry,
    profit: entry.cashOut - entry.buyIn,
    rebuys: rebuysByPlayer.get(entry.playerId) ?? 0,
  })) || [];

  const totalRebuys = [...rebuysByPlayer.values()].reduce((sum, count) => sum + count, 0);

  const isDeleted = session.deletedAt !== null;
  const settlements: Settlement[] = session.settlements ? JSON.parse(session.settlements) : [];
  const isCompleted = session.status === 'COMPLETED';
  const isLive = session.status === 'IN_PROGRESS';

  // One description of the night, shared by the text and the image so they can
  // never disagree.
  const shareInput = () =>
    buildNightShareInput({
      date: session.date,
      currency: session.group?.currency,
      entries: entriesWithStats.map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.player ? displayName(entry.player) : 'Unknown',
        profit: entry.profit,
      })),
      settlements,
      titles: summary?.titles || [],
      belt,
    });

  // Night titles are a story surface — show nicknames where the group set one.
  const displayNames = new Map(
    (session.entries || []).map((e) => [
      e.playerId,
      e.player ? displayName(e.player) : '',
    ])
  );

  const handleCopyForWhatsApp = async () => {
    const message = formatNightMessage(shareInput());

    try {
      await navigator.clipboard.writeText(message);
      toast.success('Copied settlement message for WhatsApp');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Button>
        {canEdit && (
          <div className="flex gap-2">
            {isDeleted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestore}
                disabled={restoreSession.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {restoreSession.isPending ? 'Restoring...' : 'Restore Session'}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate('/entry', {
                      state: {
                        cloneFrom: {
                          location: session.location,
                          startTime: session.startTime,
                          playerIds: session.entries?.map(e => e.playerId) || [],
                        },
                      },
                    });
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Clone
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleteSession.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteSession.isPending ? 'Deleting...' : 'Move to Trash'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {isDeleted && (
        <div className="rounded-lg border border-loss/40 bg-loss-tint px-4 py-3">
          <p className="text-label text-loss">
            This session is in the trash. It will be permanently deleted after 30 days.
          </p>
        </div>
      )}

      {/* 1 — What happened. */}
      <NightHeadline
        eyebrow={
          <>
            {format(sessionDate, 'EEEE')} night
            {isLive && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-display text-caption font-bold uppercase tracking-wider text-primary-foreground">
                <Radio className="h-2.5 w-2.5 animate-pulse" aria-hidden />
                Live
              </span>
            )}
          </>
        }
        title={format(sessionDate, 'MMMM d, yyyy')}
        meta={[
          session.startTime && {
            icon: Clock,
            label: session.endTime ? `${session.startTime} – ${session.endTime}` : session.startTime,
          },
          session.location && { icon: MapPin, label: session.location },
          { icon: Users, label: `${formatCount(entriesWithStats.length)} players` },
        ]}
        stats={[
          { label: 'Pot', value: formatMoney(totalBuyIn, { currency, decimals: 2 }) },
          totalRebuys > 0 && { label: 'Rebuys', value: formatCount(totalRebuys) },
        ]}
        entries={entriesWithStats}
        currency={currency}
        live={isLive}
      >
        {summary && summary.titles.length > 0 && (
          <NightTitleChips titles={summary.titles} nicknames={displayNames} className="mt-6" />
        )}
      </NightHeadline>

      {session.notes && (
        <Card className="px-5 py-4">
          <p className="eyebrow">Note</p>
          <p className="mt-1.5 text-label">{session.notes}</p>
        </Card>
      )}

      {/* 2 — How it finished. */}
      {entriesWithStats.length > 0 && (
        <NightResultsBoard
          rows={entriesWithStats}
          currency={currency}
          title="The result"
          description={isLive ? 'Cash-outs are recorded when the night ends' : undefined}
          showBars={!isLive}
          footer={
            // A night still in progress has no cash-outs, so it is *supposed* to
            // be short by the whole pot — calling that "unbalanced" in loss red
            // would be crying wolf. The check appears once the night is over.
            isLive ? undefined : (
              <BalanceIndicator
                totalBuyIn={totalBuyIn}
                totalCashOut={totalCashOut}
                threshold={1}
                currency={currency}
              />
            )
          }
        />
      )}

      {/* 3 — Who owes whom. The screenshot. */}
      {isCompleted && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Settlement</h2>
              <p className="text-label text-muted-foreground">Who owes whom for this night</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShareCardButton
                size="sm"
                buildScene={() => buildNightCardScene(shareInput())}
                filename={nightCardFilename(session.date)}
              />
              <Button variant="outline" size="sm" onClick={handleCopyForWhatsApp}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Copy for WhatsApp
              </Button>
            </div>
          </div>
          <div className="mt-5">
            <SettlementList
              sessionId={session.id}
              settlements={settlements}
              canEdit={canEdit}
              currency={currency}
            />
          </div>
        </Card>
      )}

      {/* 4 — What it meant. */}
      <NightStory summary={summary} loading={summaryLoading} currency={currency} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This session will be moved to trash. You can restore it within 30 days. After 30 days, it will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SessionDetail;

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, UserPlus, StopCircle } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { useRole } from '@/context/RoleContext';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import {
  useLiveSession,
  useAddRebuy,
  useUpdateRebuy,
  useDeleteRebuy,
  useAddPlayerToSession,
  useCashOutPlayer,
  useUndoCashOut,
  useEndLiveSession,
} from '@/hooks/useLiveSessions';
import RebuyDialog from '@/components/live/RebuyDialog';
import AddPlayerDialog from '@/components/live/AddPlayerDialog';
import EndSessionDialog from '@/components/live/EndSessionDialog';
import CashOutDialog from '@/components/live/CashOutDialog';
import PlayerStandingCard from '@/components/live/PlayerStandingCard';
import RebuyItinerary from '@/components/live/RebuyItinerary';
import { parseLocalDate } from '@/lib/dateUtils';
import type { SessionEntry } from '@/types';

const LiveSessionView = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedGroup } = useGroupContext();
  const { canEdit } = useRole();
  const { data: sessionData, isLoading } = useLiveSession(sessionId || '');
  const { data: allPlayers = [] } = usePlayersByGroup(selectedGroup?.id || '');
  const addRebuy = useAddRebuy();
  const updateRebuy = useUpdateRebuy();
  const deleteRebuy = useDeleteRebuy();
  const addPlayer = useAddPlayerToSession();
  const cashOutPlayer = useCashOutPlayer();
  const undoCashOut = useUndoCashOut();
  const endSession = useEndLiveSession();

  const [showRebuyDialog, setShowRebuyDialog] = useState(false);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [cashingOut, setCashingOut] = useState<SessionEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const session = sessionData?.session;

  // Calculate elapsed time based on start time
  useEffect(() => {
    if (session?.status === 'IN_PROGRESS' && session.startTime) {
      const calculateElapsed = () => {
        // Parse the session date as local date to avoid timezone issues
        const sessionDate = parseLocalDate(session.date);
        const [hours, minutes] = session.startTime!.split(':').map(Number);

        // Set the time on the local date
        sessionDate.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const elapsedMs = now.getTime() - sessionDate.getTime();
        return Math.floor(elapsedMs / 1000); // Return seconds
      };

      // Set initial value
      setElapsedSeconds(calculateElapsed());

      // Update every second
      const interval = setInterval(() => {
        setElapsedSeconds(calculateElapsed());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session?.status, session?.startTime, session?.date]);

  // Auto-open End Session dialog when navigated here with ?autoEnd=true
  const autoEnd = searchParams.get('autoEnd') === 'true';
  useEffect(() => {
    if (autoEnd) {
      setShowEndDialog(true);
      const next = new URLSearchParams(searchParams);
      next.delete('autoEnd');
      navigate({ search: next.toString() }, { replace: true });
    }
  }, [autoEnd]);

  if (isLoading || !session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (session.status !== 'IN_PROGRESS') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">This session is not in progress</p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateRebuys = (buyIn: number, defaultBuyIn: number) => {
    return Math.floor((buyIn - defaultBuyIn) / defaultBuyIn);
  };

  const handleAddRebuy = (playerId: string, amount: number) => {
    addRebuy.mutate({ sessionId: sessionId!, playerId, amount });
  };

  const handleEditRebuy = (rebuyId: string, amount: number) => {
    updateRebuy.mutate({ sessionId: sessionId!, rebuyId, amount });
  };

  const handleDeleteRebuy = (rebuyId: string) => {
    deleteRebuy.mutate({ sessionId: sessionId!, rebuyId });
  };

  const handleAddPlayer = (playerId: string, buyIn: number) => {
    addPlayer.mutate({ sessionId: sessionId!, playerId, buyIn });
  };

  const handleCashOut = (playerId: string, cashOut: number) => {
    cashOutPlayer.mutate({ sessionId: sessionId!, playerId, cashOut });
  };

  const handleUndoCashOut = (playerId: string) => {
    undoCashOut.mutate({ sessionId: sessionId!, playerId });
  };

  const handleEndSession = (endTime: string, cashOuts: Array<{ playerId: string; cashOut: number }>) => {
    endSession.mutate(
      { sessionId: sessionId!, endTime, cashOuts },
      {
        onSuccess: () => {
          // Navigate to settlement page which now includes session summary
          navigate(`/live/${sessionId}/settlement`);
        },
      }
    );
  };

  // Get players not in session
  const playersInSession = new Set(session.entries?.map(e => e.playerId) || []);
  const availablePlayers = allPlayers.filter(p => p.isActive && !playersInSession.has(p.id));

  const totalPot = session.entries?.reduce((sum, e) => sum + e.buyIn, 0) || 0;

  // Players who left early are locked: no more rebuys, and End Session already has
  // their number. The last player standing can't leave early — that's End Session.
  const stillPlaying = (session.entries ?? []).filter(e => !e.cashedOutAt);

  return (
    <div className="space-y-6">
      {/* Header with Timer — stacks on a phone, side by side from sm up */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Live Session</CardTitle>
              <CardDescription>{session.location || 'No location'}</CardDescription>
            </div>
            <div className="sm:text-right">
              <div className="text-3xl sm:text-4xl font-mono font-bold tabular-nums">
                {formatDuration(elapsedSeconds)}
              </div>
              <div className="text-sm text-muted-foreground">
                Started at {session.startTime}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Standings */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Current Standings</CardTitle>
              <CardDescription>Total pot: ${totalPot.toFixed(2)}</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {stillPlaying.length} at the table
              {stillPlaying.length !== (session.entries?.length ?? 0) &&
                ` · ${(session.entries?.length ?? 0) - stillPlaying.length} cashed out`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {session.entries?.map((entry) => (
            <PlayerStandingCard
              key={entry.id}
              entry={entry}
              rebuys={calculateRebuys(entry.buyIn, session.group?.defaultBuyIn || 0)}
              canEdit={canEdit}
              canCashOut={stillPlaying.length > 1}
              onCashOut={setCashingOut}
              onUndoCashOut={handleUndoCashOut}
            />
          ))}
        </CardContent>
      </Card>

      {/* Rebuy History */}
      <RebuyItinerary
        rebuyEvents={session.rebuyEvents || []}
        editable={canEdit}
        onEdit={handleEditRebuy}
        onDelete={handleDeleteRebuy}
      />

      {/* Quick Actions — pinned to the bottom of the viewport so they stay under a
          thumb on a phone no matter how long the standings list gets. */}
      {canEdit && (
        <div className="sticky bottom-0 -mx-4 sm:mx-0 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Button
              size="lg"
              onClick={() => setShowRebuyDialog(true)}
              className="h-14 flex-col gap-1 sm:h-20 sm:flex-row sm:gap-0"
            >
              <Plus className="h-5 w-5 sm:mr-2" />
              <span className="text-xs sm:text-sm">Rebuy</span>
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowAddPlayerDialog(true)}
              className="h-14 flex-col gap-1 sm:h-20 sm:flex-row sm:gap-0"
            >
              <UserPlus className="h-5 w-5 sm:mr-2" />
              <span className="text-xs sm:text-sm">Add Player</span>
            </Button>

            <Button
              size="lg"
              variant="destructive"
              onClick={() => setShowEndDialog(true)}
              className="h-14 flex-col gap-1 sm:h-20 sm:flex-row sm:gap-0"
            >
              <StopCircle className="h-5 w-5 sm:mr-2" />
              <span className="text-xs sm:text-sm">End Session</span>
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <RebuyDialog
        open={showRebuyDialog}
        onOpenChange={setShowRebuyDialog}
        // Cashed-out players can't rebuy — their result is already recorded.
        players={stillPlaying.map(e => ({ ...e.player!, buyIn: e.buyIn }))}
        defaultBuyIn={session.group?.defaultBuyIn || 0}
        onSubmit={handleAddRebuy}
      />

      <CashOutDialog
        open={cashingOut !== null}
        onOpenChange={(open) => !open && setCashingOut(null)}
        entry={cashingOut}
        onSubmit={handleCashOut}
      />

      <AddPlayerDialog
        open={showAddPlayerDialog}
        onOpenChange={setShowAddPlayerDialog}
        availablePlayers={availablePlayers}
        defaultBuyIn={session.group?.defaultBuyIn || 0}
        groupId={session.groupId}
        onSubmit={handleAddPlayer}
      />

      <EndSessionDialog
        open={showEndDialog}
        onOpenChange={setShowEndDialog}
        entries={session.entries || []}
        onSubmit={handleEndSession}
      />
    </div>
  );
};

export default LiveSessionView;

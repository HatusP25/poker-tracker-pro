import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserPlus, StopCircle, LogOut } from 'lucide-react';
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
      {/* Header with Timer */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Live Session</CardTitle>
              <CardDescription>{session.location || 'No location'}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-mono font-bold">{formatDuration(elapsedSeconds)}</div>
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
          <div className="flex justify-between items-center">
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Total Buy-In</TableHead>
                <TableHead className="text-right">Rebuys</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.entries?.map((entry) => {
                const rebuys = calculateRebuys(entry.buyIn, session.group?.defaultBuyIn || 0);
                const cashedOut = Boolean(entry.cashedOutAt);
                const profit = entry.cashOut - entry.buyIn;

                return (
                  <TableRow key={entry.id} className={cashedOut ? 'text-muted-foreground' : ''}>
                    <TableCell className="font-medium">{entry.player?.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${entry.buyIn.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {rebuys > 0 ? (
                        <span className="text-muted-foreground">{rebuys}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {cashedOut ? (
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={
                              profit > 0
                                ? 'text-green-600 font-medium'
                                : profit < 0
                                  ? 'text-red-600 font-medium'
                                  : ''
                            }
                          >
                            Cashed out {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
                          </span>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUndoCashOut(entry.playerId)}
                            >
                              Undo
                            </Button>
                          )}
                        </div>
                      ) : canEdit ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={stillPlaying.length <= 1}
                          title={
                            stillPlaying.length <= 1
                              ? 'Last player at the table — end the session instead'
                              : undefined
                          }
                          onClick={() => setCashingOut(entry)}
                        >
                          <LogOut className="h-3.5 w-3.5 mr-1.5" />
                          Cash out
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">Playing</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rebuy History */}
      <RebuyItinerary
        rebuyEvents={session.rebuyEvents || []}
        editable={canEdit}
        onEdit={handleEditRebuy}
        onDelete={handleDeleteRebuy}
      />

      {/* Quick Actions */}
      {canEdit && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            size="lg"
            onClick={() => setShowRebuyDialog(true)}
            className="h-20"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Rebuy
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowAddPlayerDialog(true)}
            className="h-20"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Add Player
          </Button>

          <Button
            size="lg"
            variant="destructive"
            onClick={() => setShowEndDialog(true)}
            className="h-20"
          >
            <StopCircle className="mr-2 h-5 w-5" />
            End Session
          </Button>
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

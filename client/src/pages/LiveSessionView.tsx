import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserPlus, StopCircle } from 'lucide-react';
import { useGroupContext } from '@/context/GroupContext';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useLiveSession, useAddRebuy, useAddPlayerToSession, useEndLiveSession } from '@/hooks/useLiveSessions';
import RebuyDialog from '@/components/live/RebuyDialog';
import AddPlayerDialog from '@/components/live/AddPlayerDialog';
import EndSessionDialog from '@/components/live/EndSessionDialog';
import RebuyItinerary from '@/components/live/RebuyItinerary';
import { parseLocalDate } from '@/lib/dateUtils';

const LiveSessionView = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { selectedGroup } = useGroupContext();
  const { data: sessionData, isLoading } = useLiveSession(sessionId || '');
  const { data: allPlayers = [] } = usePlayersByGroup(selectedGroup?.id || '');
  const addRebuy = useAddRebuy();
  const addPlayer = useAddPlayerToSession();
  const endSession = useEndLiveSession();

  const [showRebuyDialog, setShowRebuyDialog] = useState(false);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
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

  const handleAddPlayer = (playerId: string, buyIn: number) => {
    addPlayer.mutate({ sessionId: sessionId!, playerId, buyIn });
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
              {session.entries?.length || 0} players
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.entries?.map((entry) => {
                const rebuys = calculateRebuys(entry.buyIn, session.group?.defaultBuyIn || 0);
                return (
                  <TableRow key={entry.id}>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rebuy History */}
      <RebuyItinerary rebuyEvents={session.rebuyEvents || []} />

      {/* Quick Actions */}
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
          disabled={availablePlayers.length === 0}
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

      {/* Dialogs */}
      <RebuyDialog
        open={showRebuyDialog}
        onOpenChange={setShowRebuyDialog}
        players={session.entries?.map(e => ({ ...e.player!, buyIn: e.buyIn })) || []}
        defaultBuyIn={session.group?.defaultBuyIn || 0}
        onSubmit={handleAddRebuy}
      />

      <AddPlayerDialog
        open={showAddPlayerDialog}
        onOpenChange={setShowAddPlayerDialog}
        availablePlayers={availablePlayers}
        defaultBuyIn={session.group?.defaultBuyIn || 0}
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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useGroupContext } from '@/context/GroupContext';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useStartLiveSession } from '@/hooks/useLiveSessions';
import { Play } from 'lucide-react';

const LiveSessionStart = () => {
  const { selectedGroup } = useGroupContext();
  const navigate = useNavigate();
  const { data: players = [] } = usePlayersByGroup(selectedGroup?.id || '');
  const startSession = useStartLiveSession();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'));
  const [location, setLocation] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  if (!selectedGroup) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a group first.</p>
      </div>
    );
  }

  const handlePlayerToggle = (playerId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlayers({
        ...selectedPlayers,
        [playerId]: selectedGroup.defaultBuyIn,
      });
    } else {
      const newPlayers = { ...selectedPlayers };
      delete newPlayers[playerId];
      setSelectedPlayers(newPlayers);
    }
    setError(null);
  };

  const handleBuyInChange = (playerId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setSelectedPlayers({
        ...selectedPlayers,
        [playerId]: numValue,
      });
    }
  };

  const handleStart = () => {
    const playerCount = Object.keys(selectedPlayers).length;

    if (playerCount < 2) {
      setError('Please select at least 2 players');
      return;
    }

    const playersArray = Object.entries(selectedPlayers).map(([playerId, buyIn]) => ({
      playerId,
      buyIn,
    }));

    startSession.mutate({
      groupId: selectedGroup.id,
      date,
      startTime,
      location: location || undefined,
      players: playersArray,
    });
  };

  const selectedCount = Object.keys(selectedPlayers).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Start Live Session</h1>
        <p className="text-muted-foreground">Begin tracking a poker game in real-time</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>When and where is the game happening?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="John's House, Casino, etc."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Initial Players ({selectedCount} selected)</CardTitle>
          <CardDescription>
            Select the players starting the game and their initial buy-ins
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {players.filter(p => p.isActive).map((player) => {
            const isSelected = player.id in selectedPlayers;
            return (
              <div
                key={player.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`player-${player.id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => handlePlayerToggle(player.id, checked as boolean)}
                />
                <Label
                  htmlFor={`player-${player.id}`}
                  className="flex-1 font-medium cursor-pointer"
                >
                  {player.name}
                </Label>
                {isSelected && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Buy-in:</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={selectedPlayers[player.id]}
                      onChange={(e) => handleBuyInChange(player.id, e.target.value)}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {players.filter(p => p.isActive).length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No active players. Add players in the Players page first.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          onClick={handleStart}
          disabled={selectedCount < 2 || startSession.isPending}
          size="lg"
          className="flex-1"
        >
          <Play className="h-5 w-5 mr-2" />
          {startSession.isPending ? 'Starting...' : 'Start Live Session'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/data-entry')} size="lg">
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default LiveSessionStart;

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreatePlayer } from '@/hooks/usePlayers';
import type { Player } from '@/types';

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availablePlayers: Player[];
  defaultBuyIn: number;
  groupId: string;
  onSubmit: (playerId: string, buyIn: number) => void;
}

type Mode = 'existing' | 'new';

const AddPlayerDialog = ({ open, onOpenChange, availablePlayers, defaultBuyIn, groupId, onSubmit }: AddPlayerDialogProps) => {
  const [mode, setMode] = useState<Mode>('existing');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [buyIn, setBuyIn] = useState(defaultBuyIn.toString());
  const [newPlayerName, setNewPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createPlayer = useCreatePlayer();

  useEffect(() => {
    if (!open) {
      setMode('existing');
      setSelectedPlayerId('');
      setBuyIn(defaultBuyIn.toString());
      setNewPlayerName('');
      setError(null);
    }
  }, [open, defaultBuyIn]);

  const handleSubmit = async () => {
    const parsedBuyIn = parseFloat(buyIn);
    if (parsedBuyIn <= 0) return;

    if (mode === 'existing') {
      if (!selectedPlayerId) return;
      onSubmit(selectedPlayerId, parsedBuyIn);
      onOpenChange(false);
      return;
    }

    const trimmedName = newPlayerName.trim();
    if (!trimmedName) return;

    setError(null);
    try {
      const result = await createPlayer.mutateAsync({ groupId, name: trimmedName });
      onSubmit(result.data.id, parsedBuyIn);
      onOpenChange(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to create player');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Player to Game</DialogTitle>
          <DialogDescription>
            Add a player who's joining the game mid-session
          </DialogDescription>
        </DialogHeader>

        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode('existing'); setError(null); }}
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              mode === 'existing'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-accent'
            )}
          >
            Existing Player
          </button>
          <button
            type="button"
            onClick={() => { setMode('new'); setError(null); }}
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              mode === 'new'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-accent'
            )}
          >
            New Player
          </button>
        </div>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            {mode === 'existing' ? (
              <>
                <Label>Player</Label>
                {availablePlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No available players. Switch to New Player to add someone.</p>
                ) : (
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            ) : (
              <>
                <Label htmlFor="new-player-name">Player Name</Label>
                <Input
                  id="new-player-name"
                  placeholder="Enter full name"
                  value={newPlayerName}
                  onChange={(e) => { setNewPlayerName(e.target.value); setError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                  autoFocus
                />
              </>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="player-buyin">Initial Buy-In</Label>
            <Input
              id="player-buyin"
              type="number"
              step="0.01"
              min="0"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createPlayer.isPending ||
              (mode === 'existing' ? (!selectedPlayerId || availablePlayers.length === 0) : !newPlayerName.trim()) ||
              parseFloat(buyIn) <= 0
            }
          >
            {createPlayer.isPending ? 'Creating...' : 'Add Player'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlayerDialog;

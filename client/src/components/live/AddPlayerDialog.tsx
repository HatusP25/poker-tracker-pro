import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Player } from '@/types';

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availablePlayers: Player[];
  defaultBuyIn: number;
  onSubmit: (playerId: string, buyIn: number) => void;
}

const AddPlayerDialog = ({ open, onOpenChange, availablePlayers, defaultBuyIn, onSubmit }: AddPlayerDialogProps) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [buyIn, setBuyIn] = useState(defaultBuyIn.toString());

  const handleSubmit = () => {
    if (selectedPlayerId && parseFloat(buyIn) > 0) {
      onSubmit(selectedPlayerId, parseFloat(buyIn));
      setSelectedPlayerId('');
      setBuyIn(defaultBuyIn.toString());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Player to Game</DialogTitle>
          <DialogDescription>
            Add a new player who's joining the game mid-session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Player</Label>
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
          <Button onClick={handleSubmit} disabled={!selectedPlayerId || parseFloat(buyIn) <= 0}>
            Add Player
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlayerDialog;

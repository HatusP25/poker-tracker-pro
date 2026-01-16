import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Player } from '@/types';

interface RebuyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Array<Player & { buyIn: number }>;
  defaultBuyIn: number;
  onSubmit: (playerId: string, amount: number) => void;
}

const RebuyDialog = ({ open, onOpenChange, players, defaultBuyIn, onSubmit }: RebuyDialogProps) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [amount, setAmount] = useState(defaultBuyIn.toString());

  const handleSubmit = () => {
    if (selectedPlayerId && parseFloat(amount) > 0) {
      onSubmit(selectedPlayerId, parseFloat(amount));
      setSelectedPlayerId('');
      setAmount(defaultBuyIn.toString());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Rebuy</DialogTitle>
          <DialogDescription>
            Add additional buy-in for a player already in the game
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
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name} (Current: ${player.buyIn.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rebuy-amount">Rebuy Amount</Label>
            <Input
              id="rebuy-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmount(defaultBuyIn.toString())}
            >
              ${defaultBuyIn}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmount((defaultBuyIn * 2).toString())}
            >
              ${defaultBuyIn * 2}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmount((defaultBuyIn * 0.5).toString())}
            >
              ${defaultBuyIn * 0.5}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedPlayerId || parseFloat(amount) <= 0}>
            Add Rebuy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RebuyDialog;

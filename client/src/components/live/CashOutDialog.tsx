import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateCashOut, clampCashOut } from '@/lib/moneyValidation';
import type { SessionEntry } from '@/types';

interface CashOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The player leaving. Null while the dialog is closed. */
  entry: SessionEntry | null;
  onSubmit: (playerId: string, cashOut: number) => void;
}

/**
 * Cash a player out because they're leaving before the night ends. Their result is
 * recorded now and locked; End Session won't ask for it again.
 */
const CashOutDialog = ({ open, onOpenChange, entry, onSubmit }: CashOutDialogProps) => {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open) setAmount('');
  }, [open, entry?.playerId]);

  if (!entry) return null;

  const validity = validateCashOut(parseFloat(amount));
  const showError = amount.trim() !== '' && !validity.valid;
  const profit = (parseFloat(amount) || 0) - entry.buyIn;

  const handleBlur = () => {
    if (amount.trim() === '') return;
    setAmount(String(clampCashOut(parseFloat(amount))));
  };

  const handleSubmit = () => {
    if (!validity.valid) return;
    onSubmit(entry.playerId, parseFloat(amount));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cash out {entry.player?.name}</DialogTitle>
          <DialogDescription>
            Count their chips now. They'll stay in the results, and you won't be asked for
            this again when the night ends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total buy-in</span>
            <span className="font-mono">${entry.buyIn.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-out-amount">Cash-out</Label>
            <Input
              id="cash-out-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max={10000}
              autoFocus
              value={amount}
              placeholder="0.00"
              onChange={(e) => setAmount(e.target.value)}
              onBlur={handleBlur}
              data-testid="early-cashout-input"
            />
            {showError && <p className="text-sm text-destructive">{validity.message}</p>}
          </div>

          {amount.trim() !== '' && validity.valid && (
            <div
              className={`text-sm font-medium ${
                profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}
            >
              {entry.player?.name} finishes {profit >= 0 ? 'up' : 'down'} $
              {Math.abs(profit).toFixed(2)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={amount.trim() === '' || !validity.valid}>
            Cash out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashOutDialog;

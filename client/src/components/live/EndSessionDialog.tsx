import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateCashOut, clampCashOut } from '@/lib/moneyValidation';
import type { SessionEntry } from '@/types';

interface EndSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: SessionEntry[];
  onSubmit: (endTime: string, cashOuts: Array<{ playerId: string; cashOut: number }>) => void;
}

const EndSessionDialog = ({ open, onOpenChange, entries, onSubmit }: EndSessionDialogProps) => {
  const [endTime, setEndTime] = useState(format(new Date(), 'HH:mm'));
  const [cashOuts, setCashOuts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize cash-outs with zeros
    const initialCashOuts: Record<string, string> = {};
    entries.forEach((entry) => {
      initialCashOuts[entry.playerId] = '0';
    });
    setCashOuts(initialCashOuts);
  }, [entries]);

  const handleCashOutChange = (playerId: string, value: string) => {
    setCashOuts({
      ...cashOuts,
      [playerId]: value,
    });
    setError(null);
  };

  // Snap a nonsensical cash-out (e.g. negative) into its valid range on blur.
  const handleCashOutBlur = (playerId: string) => {
    const raw = cashOuts[playerId] ?? '';
    if (raw.trim() === '') return;
    setCashOuts((prev) => ({
      ...prev,
      [playerId]: String(clampCashOut(parseFloat(raw))),
    }));
  };

  const anyCashOutInvalid = entries.some(
    (entry) => !validateCashOut(parseFloat(cashOuts[entry.playerId] ?? '')).valid
  );

  const handleSubmit = () => {
    setError(null);

    // Validate all players have cash-outs
    for (const entry of entries) {
      if (!cashOuts[entry.playerId] || cashOuts[entry.playerId].trim() === '') {
        setError(`Please enter cash-out for ${entry.player?.name || 'all players'}`);
        return;
      }
    }

    // Calculate totals
    const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);
    const totalCashOut = Object.values(cashOuts).reduce(
      (sum, v) => sum + (parseFloat(v) || 0),
      0
    );

    // Check if zero-sum (within 1% tolerance for rounding)
    const difference = Math.abs(totalCashOut - totalBuyIn);
    if (difference > totalBuyIn * 0.01) {
      setError(
        `Total cash-outs ($${totalCashOut.toFixed(2)}) must equal total buy-ins ($${totalBuyIn.toFixed(2)}). Difference: $${difference.toFixed(2)}`
      );
      return;
    }

    const cashOutsArray = entries.map((entry) => ({
      playerId: entry.playerId,
      cashOut: parseFloat(cashOuts[entry.playerId]),
    }));

    onSubmit(endTime, cashOutsArray);
  };

  const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);
  const totalCashOut = Object.values(cashOuts).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  );
  const difference = totalCashOut - totalBuyIn;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>End Live Session</DialogTitle>
          <DialogDescription>
            Enter final cash-out amounts for all players
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="end-time">End Time</Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Player Cash-Outs</Label>
            {entries.map((entry) => {
              const raw = cashOuts[entry.playerId] ?? '';
              const cashOutValue = parseFloat(raw || '0');
              const profit = cashOutValue - entry.buyIn;
              const validity = validateCashOut(parseFloat(raw));
              const showError = raw.trim() !== '' && !validity.valid;

              return (
                <div key={entry.id} className="space-y-1">
                  <div className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                    <div className="flex-1">
                      <div className="font-medium">{entry.player?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Buy-in: ${entry.buyIn.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">
                        Cash-out:
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={10000}
                        value={cashOuts[entry.playerId] || ''}
                        onChange={(e) => handleCashOutChange(entry.playerId, e.target.value)}
                        onBlur={() => handleCashOutBlur(entry.playerId)}
                        className="w-28"
                        data-testid={`cashout-input-${entry.player?.name}`}
                      />
                    </div>
                    {cashOutValue > 0 && (
                      <div
                        className={`text-sm font-medium w-20 text-right ${
                          profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}
                      >
                        {profit > 0 && '+'}${profit.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {showError && (
                    <p className="text-sm text-destructive pl-3">{validity.message}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg bg-muted space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Buy-Ins:</span>
              <span>${totalBuyIn.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Cash-Outs:</span>
              <span>${totalCashOut.toFixed(2)}</span>
            </div>
            <div
              className={`flex justify-between items-center font-bold ${
                Math.abs(difference) < 0.01
                  ? 'text-green-600'
                  : 'text-destructive'
              }`}
            >
              <span>Difference:</span>
              <span>${difference.toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/50">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={anyCashOutInvalid || Math.abs(difference) > totalBuyIn * 0.01}
          >
            End Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EndSessionDialog;

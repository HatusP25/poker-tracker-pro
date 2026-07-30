import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateCashOut, clampCashOut } from '@/lib/moneyValidation';
import {
  computeDiscrepancy,
  splitEvenly,
  assignToOne,
  type CashOutRow,
  type ReconcileResult,
} from '@/lib/reconcile';
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
  const [assignee, setAssignee] = useState<string>('');

  // Players who left early already have a locked-in result; only the rest need a
  // number entered here.
  const settled = entries.filter((e) => e.cashedOutAt);
  const awaiting = entries.filter((e) => !e.cashedOutAt);

  useEffect(() => {
    const initial: Record<string, string> = {};
    awaiting.forEach((entry) => {
      initial[entry.playerId] = '0';
    });
    setCashOuts(initial);
    setAssignee('');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const handleCashOutChange = (playerId: string, value: string) => {
    setCashOuts((prev) => ({ ...prev, [playerId]: value }));
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

  const anyCashOutInvalid = awaiting.some(
    (entry) => !validateCashOut(parseFloat(cashOuts[entry.playerId] ?? '')).valid
  );

  const totalBuyIn = entries.reduce((sum, e) => sum + e.buyIn, 0);

  /** Every player's number: locked for early exits, typed for the rest. */
  const allRows: CashOutRow[] = entries.map((entry) => ({
    playerId: entry.playerId,
    playerName: entry.player?.name ?? '',
    cashOut: entry.cashedOutAt
      ? entry.cashOut
      : parseFloat(cashOuts[entry.playerId] ?? '') || 0,
  }));

  const difference = computeDiscrepancy(totalBuyIn, allRows);
  const reconciled = Math.abs(difference) < 0.01;
  const totalCashOut = allRows.reduce((sum, r) => sum + r.cashOut, 0);

  /** Apply a reconcile result to the editable fields, refusing if it can't be done. */
  // Compared against the literal rather than `!result.ok`: this project builds with
  // `strict: false`, under which truthiness narrowing of a discriminated union
  // doesn't apply.
  const applyResult = (result: ReconcileResult) => {
    if (result.ok === false) {
      setError(result.reason);
      return;
    }
    const { cashOuts: adjusted } = result;
    setCashOuts((prev) => {
      const next = { ...prev };
      for (const entry of awaiting) {
        next[entry.playerId] = String(adjusted[entry.playerId] ?? 0);
      }
      return next;
    });
    setError(null);
  };

  const handleSplitEvenly = () =>
    applyResult(
      splitEvenly(
        allRows,
        totalBuyIn,
        awaiting.map((e) => e.playerId)
      )
    );

  const handleAssignToOne = () => {
    if (!assignee) return;
    applyResult(assignToOne(allRows, totalBuyIn, assignee));
  };

  const handleSubmit = () => {
    setError(null);

    for (const entry of awaiting) {
      if (!cashOuts[entry.playerId] || cashOuts[entry.playerId].trim() === '') {
        setError(`Please enter cash-out for ${entry.player?.name || 'all players'}`);
        return;
      }
    }

    // Match the server exactly: it requires the table to reconcile to the cent and
    // rejects anything else, so there is no point letting a near-miss through here.
    if (!reconciled) {
      setError(
        `Cash-outs are $${Math.abs(difference).toFixed(2)} ${difference > 0 ? 'over' : 'short'}. ` +
          'Resolve the difference before ending the session.'
      );
      return;
    }

    onSubmit(
      endTime,
      awaiting.map((entry) => ({
        playerId: entry.playerId,
        cashOut: parseFloat(cashOuts[entry.playerId]),
      }))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>End Live Session</DialogTitle>
          <DialogDescription>
            {settled.length > 0
              ? `Enter cash-outs for the ${awaiting.length} still at the table`
              : 'Enter final cash-out amounts for all players'}
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

          {settled.length > 0 && (
            <div className="space-y-2">
              <Label>Already cashed out</Label>
              {settled.map((entry) => {
                const profit = entry.cashOut - entry.buyIn;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/40 text-sm"
                  >
                    <div>
                      <div className="font-medium">{entry.player?.name}</div>
                      <div className="text-muted-foreground">
                        Buy-in ${entry.buyIn.toFixed(2)} · Cash-out ${entry.cashOut.toFixed(2)}
                      </div>
                    </div>
                    <div
                      className={`font-medium ${
                        profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}
                    >
                      {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            <Label>Player Cash-Outs</Label>
            {awaiting.map((entry) => {
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
                        inputMode="decimal"
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
                reconciled ? 'text-green-600' : 'text-destructive'
              }`}
            >
              <span>Difference:</span>
              <span>${difference.toFixed(2)}</span>
            </div>
          </div>

          {/* Reconciliation helper — chip counts never match to the cent. */}
          {!reconciled && !anyCashOutInvalid && (
            <div
              className="p-4 rounded-lg border border-amber-500/50 bg-amber-500/10 space-y-3"
              data-testid="reconcile-helper"
            >
              <div className="text-sm">
                <p className="font-semibold">
                  The table is ${Math.abs(difference).toFixed(2)}{' '}
                  {difference > 0 ? 'over' : 'short'}
                </p>
                <p className="text-muted-foreground">
                  Chip counts rarely match exactly. Settle the difference deliberately
                  rather than guessing at a number.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSplitEvenly}
                  data-testid="reconcile-split"
                >
                  Split across the table
                </Button>

                <div className="flex items-center gap-2">
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger className="w-44" data-testid="reconcile-assignee">
                      <SelectValue placeholder="Assign to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {awaiting.map((entry) => (
                        <SelectItem key={entry.playerId} value={entry.playerId}>
                          {entry.player?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!assignee}
                    onClick={handleAssignToOne}
                    data-testid="reconcile-assign"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}

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
          <Button onClick={handleSubmit} disabled={anyCashOutInvalid || !reconciled}>
            End Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EndSessionDialog;

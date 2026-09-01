import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Copy } from 'lucide-react';
import { validateBuyIn, validateCashOut, clampCashOut, MAX_BUY_IN, MAX_CASH_OUT } from '@/lib/moneyValidation';
import { deriveRebuyCount } from '@/lib/nightRebuys';
import { cn } from '@/lib/utils';
import { formatCount, formatMoney, moneyTextClass } from '@/lib/viz';
import type { Player } from '@/types';

interface EntryRowProps {
  index: number;
  players: Player[];
  selectedPlayerId: string;
  buyIn: number;
  cashOut: number;
  defaultBuyIn: number;
  onPlayerChange: (playerId: string) => void;
  onBuyInChange: (value: number) => void;
  onCashOutChange: (value: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  showDuplicate?: boolean;
  /** ISO code from `group.currency`; falls back to "$". */
  currency?: string | null;
}

const EntryRow = ({
  index,
  players,
  selectedPlayerId,
  buyIn,
  cashOut,
  defaultBuyIn,
  onPlayerChange,
  onBuyInChange,
  onCashOutChange,
  onRemove,
  onDuplicate,
  showDuplicate = true,
  currency,
}: EntryRowProps) => {
  const profit = cashOut - buyIn;
  // A whole number of trips to the bank. This used to divide the excess by the
  // buy-in and print the quotient, so $17 at a $5 default read "2.4x".
  const rebuys = deriveRebuyCount(buyIn, defaultBuyIn);
  const profitText = formatMoney(profit, { currency, signed: true, decimals: 2 });

  const availablePlayers = players.filter((p) => p.isActive);

  // Only flag a field once it has a value; an untouched (0/empty) row isn't an error.
  const buyInValidity = validateBuyIn(buyIn);
  const cashOutValidity = validateCashOut(cashOut);
  const showBuyInError = buyIn !== 0 && !buyInValidity.valid;
  const showCashOutError = cashOut !== 0 && !cashOutValidity.valid;

  return (
    <div className="space-y-1">
    <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-1 sm:gap-2 items-center">
      {/* Player Select */}
      <div className="col-span-6 sm:col-span-3 lg:col-span-4">
        <select
          value={selectedPlayerId}
          onChange={(e) => onPlayerChange(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select player...</option>
          {availablePlayers.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
      </div>

      {/* Buy-In */}
      <div className="col-span-3 sm:col-span-2 lg:col-span-2">
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          max={MAX_BUY_IN}
          placeholder="Buy-in"
          value={buyIn || ''}
          onChange={(e) => onBuyInChange(parseFloat(e.target.value) || 0)}
        />
      </div>

      {/* Cash-Out */}
      <div className="col-span-3 sm:col-span-2 lg:col-span-2">
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          max={MAX_CASH_OUT}
          placeholder="Cash-out"
          value={cashOut || ''}
          onChange={(e) => onCashOutChange(parseFloat(e.target.value) || 0)}
          onBlur={() => { if (cashOut !== clampCashOut(cashOut)) onCashOutChange(clampCashOut(cashOut)); }}
        />
      </div>

      {/* Profit - Hidden on mobile, shown on large screens */}
      <div className="hidden lg:block lg:col-span-1 text-right">
        <span className={cn('font-display text-label font-semibold tnum', moneyTextClass(profit))}>
          {profitText}
        </span>
      </div>

      {/* Rebuys - Hidden on mobile, shown on large screens */}
      <div className="hidden text-center text-label text-muted-foreground tnum lg:col-span-1 lg:block">
        {rebuys > 0 ? formatCount(rebuys) : '—'}
      </div>

      {/* Actions - Mobile shows profit inline */}
      <div className="col-span-6 sm:col-span-1 lg:col-span-2 flex gap-1 justify-between sm:justify-end items-center">
        {/* Show profit on mobile/tablet only */}
        <span
          className={cn('font-display text-label font-semibold tnum lg:hidden', moneyTextClass(profit))}
        >
          {profitText}
        </span>

        {/* Action buttons */}
        <div className="flex gap-1">
          {showDuplicate && (
            <Button type="button" variant="ghost" size="sm" onClick={onDuplicate} title="Duplicate entry">
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} title="Remove entry">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
    {(showBuyInError || showCashOutError) && (
      <div className="flex flex-wrap gap-x-4 text-sm text-destructive">
        {showBuyInError && <span data-testid="buyin-error">{buyInValidity.message}</span>}
        {showCashOutError && <span data-testid="cashout-error">{cashOutValidity.message}</span>}
      </div>
    )}
    </div>
  );
};

export default EntryRow;

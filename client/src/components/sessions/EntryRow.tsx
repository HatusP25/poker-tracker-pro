import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Copy } from 'lucide-react';
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
}: EntryRowProps) => {
  const profit = cashOut - buyIn;
  const rebuys = buyIn > defaultBuyIn ? (buyIn - defaultBuyIn) / defaultBuyIn : 0;

  const availablePlayers = players.filter((p) => p.isActive);

  return (
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
          step="0.01"
          placeholder="Buy-in"
          value={buyIn || ''}
          onChange={(e) => onBuyInChange(parseFloat(e.target.value) || 0)}
        />
      </div>

      {/* Cash-Out */}
      <div className="col-span-3 sm:col-span-2 lg:col-span-2">
        <Input
          type="number"
          step="0.01"
          placeholder="Cash-out"
          value={cashOut || ''}
          onChange={(e) => onCashOutChange(parseFloat(e.target.value) || 0)}
        />
      </div>

      {/* Profit - Hidden on mobile, shown on large screens */}
      <div className="hidden lg:block lg:col-span-1 text-right">
        <span className={`font-medium text-sm ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {profit >= 0 ? '+' : ''}
          {profit.toFixed(2)}
        </span>
      </div>

      {/* Rebuys - Hidden on mobile, shown on large screens */}
      <div className="hidden lg:block lg:col-span-1 text-center text-sm text-muted-foreground">
        {rebuys > 0 ? `${rebuys.toFixed(1)}x` : '-'}
      </div>

      {/* Actions - Mobile shows profit inline */}
      <div className="col-span-6 sm:col-span-1 lg:col-span-2 flex gap-1 justify-between sm:justify-end items-center">
        {/* Show profit on mobile/tablet only */}
        <span className="lg:hidden text-sm font-medium">
          <span className={profit >= 0 ? 'text-green-500' : 'text-red-500'}>
            {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
          </span>
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
  );
};

export default EntryRow;

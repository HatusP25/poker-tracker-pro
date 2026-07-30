import { Button } from '@/components/ui/button';
import { LogOut, Undo2 } from 'lucide-react';
import type { SessionEntry } from '@/types';

interface PlayerStandingCardProps {
  entry: SessionEntry;
  rebuys: number;
  canEdit: boolean;
  /** False for the last player still playing — leaving is End Session's job. */
  canCashOut: boolean;
  onCashOut: (entry: SessionEntry) => void;
  onUndoCashOut: (playerId: string) => void;
}

/**
 * One player in the live standings.
 *
 * A card rather than a table row: this is the screen in someone's hand at the
 * table, where a four-column table is unreadable and its buttons are too small to
 * hit. One layout for both phone and desktop — a home game is under ten players,
 * so a card list reads fine on a laptop too.
 */
const PlayerStandingCard = ({
  entry,
  rebuys,
  canEdit,
  canCashOut,
  onCashOut,
  onUndoCashOut,
}: PlayerStandingCardProps) => {
  const cashedOut = Boolean(entry.cashedOutAt);
  const profit = entry.cashOut - entry.buyIn;

  return (
    <div
      data-testid={`standing-${entry.player?.name}`}
      className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
        cashedOut ? 'bg-muted/40' : 'bg-card'
      }`}
    >
      <div className="min-w-0">
        <div className={`font-medium truncate ${cashedOut ? 'text-muted-foreground' : ''}`}>
          {entry.player?.name}
        </div>
        <div className="text-sm text-muted-foreground font-mono">
          ${entry.buyIn.toFixed(2)}
          {rebuys > 0 && (
            <span className="font-sans">
              {' '}
              · {rebuys} rebuy{rebuys === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      {cashedOut ? (
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div
              className={`font-semibold ${
                profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}
            >
              {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Cashed out</div>
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10"
              aria-label={`Undo cash-out for ${entry.player?.name}`}
              onClick={() => onUndoCashOut(entry.playerId)}
            >
              <Undo2 className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">Undo</span>
            </Button>
          )}
        </div>
      ) : canEdit ? (
        <Button
          variant="outline"
          className="h-10 shrink-0"
          disabled={!canCashOut}
          title={canCashOut ? undefined : 'Last player at the table — end the session instead'}
          aria-label={`Cash out ${entry.player?.name}`}
          onClick={() => onCashOut(entry)}
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Cash out
        </Button>
      ) : (
        <span className="text-sm text-muted-foreground shrink-0">Playing</span>
      )}
    </div>
  );
};

export default PlayerStandingCard;

import { RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat-tile';
import { Button } from '@/components/ui/button';
import { playerInitials } from '@/components/ui/player-chip';
import { playerColor } from '@/lib/viz/playerColor';
import { displayName } from '@/lib/displayName';
import { formatMoney } from '@/lib/viz/money';
import { moneySign } from '@/lib/viz/sign';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';
import { DominanceBeam } from './DominanceBeam';
import { RunStrip } from './RunStrip';
import { faceOffGlow } from './rivalColor';
import { formatRecord, nightsLabel, streakLine, tieNote } from './rivalCopy';
import type { RivalPair, RivalThresholds } from './rivalMatrix';

/**
 * The matchup, full size.
 *
 * The tab's one hero: two players facing each other across a scoreline, lit
 * from each side in their own colour. It opens on the group's main event and
 * becomes whichever pairing you pick out of the grid, so there is exactly one
 * place on the page where a rivalry is told in full rather than a detail panel
 * competing with a headline card for the same job.
 */

export interface MatchupCardProps {
  pair: RivalPair;
  playersById: Map<string, Player>;
  thresholds: RivalThresholds;
  currency?: string | null;
  /** True while showing the auto-picked headline rather than a chosen pairing. */
  isMainEvent: boolean;
  onClear?: () => void;
  className?: string;
}

const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

interface SideProps {
  id: string;
  name: string;
  wins: number;
  profit: number;
  currency?: string | null;
}

const Side = ({ id, name, wins, profit, currency }: SideProps) => (
  <div className="flex min-w-0 flex-col items-center gap-2 text-center">
    <span
      aria-hidden
      className="grid h-12 w-12 place-items-center rounded-full font-display text-base font-bold shadow-elev-2 sm:h-16 sm:w-16 sm:text-xl"
      style={{ backgroundColor: playerColor(id), color: 'hsl(var(--background))' }}
    >
      {playerInitials(name)}
    </span>
    <span className="w-full truncate font-display text-label font-semibold sm:text-lg">{name}</span>
    <span
      className={cn(
        'font-display text-caption font-semibold tnum sm:text-label-sm',
        profit > 0 ? 'text-profit' : profit < 0 ? 'text-loss' : 'text-neutral'
      )}
    >
      {formatMoney(profit, { currency, signed: true })}
    </span>
    <span className="sr-only">{wins} wins</span>
  </div>
);

const MatchupCard = ({
  pair,
  playersById,
  thresholds,
  currency,
  isMainEvent,
  onClear,
  className,
}: MatchupCardProps) => {
  const aName = displayName(playersById.get(pair.aId) ?? { name: pair.aName });
  const bName = displayName(playersById.get(pair.bId) ?? { name: pair.bName });
  const aLeads = pair.aWins > pair.bWins;
  const bLeads = pair.bWins > pair.aWins;

  const moneyLeader =
    pair.differential > 0 ? aName : pair.differential < 0 ? bName : null;
  const swing = Math.abs(pair.differential);
  const streakName =
    pair.streakHolderId === pair.aId ? aName : pair.streakHolderId === pair.bId ? bName : null;
  const streak = streakLine(streakName, pair.streakCount);
  const ties = tieNote(pair.ties);
  const thin = pair.shared < thresholds.minSessions;

  return (
    <Card className={cn('relative animate-rise overflow-hidden shadow-elev-2', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: faceOffGlow(pair.aId, pair.bId) }}
      />

      <div className="relative p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-primary">{isMainEvent ? 'Main event' : 'The matchup'}</p>
            <p className="mt-0.5 text-label-sm text-muted-foreground">
              {thin
                ? `Only ${nightsLabel(pair.shared)} together — too early to call`
                : `${nightsLabel(pair.shared)} at the same table`}
            </p>
          </div>
          {!isMainEvent && onClear && (
            <Button variant="ghost" size="sm" onClick={onClear} className="shrink-0 gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Main event</span>
            </Button>
          )}
        </div>

        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-8">
          <Side
            id={pair.aId}
            name={aName}
            wins={pair.aWins}
            profit={pair.differential}
            currency={currency}
          />

          <div className="flex flex-col items-center">
            <p className="flex items-baseline font-display text-display-4 leading-none tnum sm:text-display-2">
              <span className={aLeads ? 'text-foreground' : 'text-muted-foreground'}>
                {pair.aWins}
              </span>
              <span className="mx-1.5 text-neutral sm:mx-2.5">–</span>
              <span className={bLeads ? 'text-foreground' : 'text-muted-foreground'}>
                {pair.bWins}
              </span>
            </p>
            <p className="mt-2 text-caption uppercase tracking-[0.12em] text-muted-foreground">
              {ties ?? 'nights won'}
            </p>
          </div>

          <Side
            id={pair.bId}
            name={bName}
            wins={pair.bWins}
            profit={-pair.differential}
            currency={currency}
          />
        </div>

        <DominanceBeam
          className="mx-auto mt-6 max-w-2xl"
          leftId={pair.aId}
          leftWins={pair.aWins}
          rightId={pair.bId}
          rightWins={pair.bWins}
          ties={pair.ties}
          size="lg"
          animate
          label={`${aName} ${formatRecord(pair.aWins, pair.bWins)} ${bName}${
            ties ? `, ${ties}` : ''
          }`}
        />

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border pt-5 sm:grid-cols-3">
          <StatTile
            plain
            size="sm"
            label="Shared nights"
            value={pair.shared}
            hint={
              pair.nights.length > 0
                ? `since ${shortDate(pair.nights[0].date)}`
                : undefined
            }
          />
          <StatTile
            plain
            size="sm"
            label="Profit swing"
            value={formatMoney(swing, { currency, signed: swing > 0 })}
            sign={moneySign(swing)}
            hint={
              moneyLeader
                ? `${moneyLeader} is up, across these nights`
                : 'Dead level on money'
            }
          />
          <StatTile
            plain
            size="sm"
            className="col-span-2 sm:col-span-1"
            label="Current run"
            value={pair.streakCount > 0 ? pair.streakCount : '—'}
            hint={streak ?? 'Their last night together was a draw'}
          />
        </div>

        {pair.nights.length > 1 && (
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="eyebrow">Recent nights</p>
              <p className="text-caption text-muted-foreground">oldest → latest</p>
            </div>
            <RunStrip className="mt-2.5" pair={pair} limit={14} currency={currency} />
          </div>
        )}
      </div>
    </Card>
  );
};

export { MatchupCard };

import { ArrowRight } from 'lucide-react';
import { DeltaChip } from '@/components/ui/delta-chip';
import { PlayerChip } from '@/components/ui/player-chip';
import { cn } from '@/lib/utils';
import type { RankingChange } from '@/types';

/**
 * What the night did to the standings.
 *
 * Was a five-column table whose last column repeated the profit figure already
 * shown twice elsewhere on the same page. The movement is the only thing this
 * block knows that nothing else does, so that is all it says now: where you
 * were, where you are, and how far you travelled.
 */

const rankLabel = (rank: number): string => {
  if (rank === 0) return 'unranked';
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
};

interface RankingChangesSectionProps {
  changes: RankingChange[];
  className?: string;
}

const RankingChangesSection = ({ changes, className }: RankingChangesSectionProps) => {
  if (changes.length === 0) return null;

  // Biggest movers first — a night where nobody moved should not lead with the
  // people who didn't.
  const ordered = [...changes].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="eyebrow">Standings after this night</h3>
      <ul className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border bg-surface-2">
        {ordered.map((change) => (
          <li key={change.playerId} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <PlayerChip
                player={{ id: change.playerId, name: change.playerName }}
                size="sm"
                className="font-semibold"
              />
            </div>
            <span className="flex shrink-0 items-center gap-1.5 font-display text-label-sm tnum text-muted-foreground">
              {rankLabel(change.oldRank)}
              <ArrowRight className="h-3 w-3" aria-hidden />
              <span className="text-foreground">{rankLabel(change.newRank)}</span>
            </span>
            <span className="w-16 shrink-0 text-right">
              {change.change === 0 ? (
                <span className="text-label-sm text-muted-foreground">held</span>
              ) : (
                <DeltaChip
                  value={change.change}
                  variant="plain"
                  format={(v) => `${Math.abs(v)}`}
                  aria-label={`${change.change > 0 ? 'up' : 'down'} ${Math.abs(change.change)} places`}
                />
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default RankingChangesSection;

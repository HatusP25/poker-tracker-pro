import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { playerColor } from '@/lib/viz/playerColor';
import { formatLocalDate } from '@/lib/dateUtils';
import { computeBeltSegments } from '@/lib/beltSegments';
import type { BeltLineage } from '@/types';
import type { BeltSummary } from './pulseCopy';

/**
 * Who is wearing it.
 *
 * The most-wanted object in the product, so it gets a panel of its own rather
 * than a row in a list. The full lineage, the reign records and the
 * title-change history live in Insights; this is the standing answer plus the
 * shape of how it got here.
 *
 * The lineage strip is hand-drawn from flexbox — no chart library on the entry
 * route. Segment width is each reign's share of every night the belt has
 * existed, coloured by the holder's permanent colour.
 */

interface BeltPanelProps {
  belt: BeltSummary | null;
  lineage: BeltLineage | undefined;
  loading?: boolean;
}

const BeltPanel = ({ belt, lineage, loading }: BeltPanelProps) => {
  if (loading) {
    return (
      <Card className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-3 w-52" />
        <Skeleton className="mt-auto h-4 w-full" />
      </Card>
    );
  }

  if (!belt) {
    return (
      <Card className="flex h-full flex-col p-6">
        <span className="eyebrow">The belt</span>
        <EmptyState
          size="sm"
          title="Nobody holds it yet"
          description="The first winner takes the belt. After that it only moves when the holder is beaten at the table."
          className="flex-1"
        />
      </Card>
    );
  }

  const segments = lineage ? computeBeltSegments(lineage) : [];
  const nightWord = belt.nightsHeld === 1 ? 'night' : 'nights';

  return (
    <Card className="animate-rise stagger-2 flex h-full flex-col p-6">
      <span className="eyebrow">The belt</span>

      <div className="mt-3 flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-player-1/30 bg-player-1/10 text-lg"
        >
          🏆
        </span>
        <Link
          to={`/stats/player/${belt.holderId}`}
          className="min-w-0 font-display text-display-4 leading-none tracking-tight text-foreground transition-colors hover:text-primary"
        >
          <span className="block truncate">{belt.holderName}</span>
        </Link>
      </div>

      <p className="mt-3 text-label text-muted-foreground">
        Holding it since {formatLocalDate(belt.sinceDate, 'MMM dd, yyyy')}
        {belt.takenFrom ? `, when it came off ${belt.takenFrom}.` : ' — the first champion.'}
      </p>

      <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-border py-4">
        <div>
          <dt className="eyebrow">Nights</dt>
          <dd className="mt-0.5 font-display text-stat-sm tnum text-foreground">
            {belt.nightsHeld}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Defenses</dt>
          <dd className="mt-0.5 font-display text-stat-sm tnum text-foreground">{belt.defenses}</dd>
        </div>
        <div>
          <dt className="eyebrow">Changes</dt>
          <dd className="mt-0.5 font-display text-stat-sm tnum text-foreground">
            {belt.totalTitleChanges}
          </dd>
        </div>
      </dl>

      {segments.length > 0 && (
        <div className="mt-4">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
            {segments.map((segment, index) => (
              <div
                key={`${segment.playerId}-${segment.fromDate}-${index}`}
                title={`${segment.playerName} · ${segment.nightsHeld} ${
                  segment.nightsHeld === 1 ? 'night' : 'nights'
                }`}
                style={{
                  width: `${segment.widthPercent}%`,
                  backgroundColor: playerColor(segment.playerId),
                }}
                className="min-w-[2px]"
              />
            ))}
          </div>
          <p className="mt-2 text-caption text-muted-foreground">
            Every reign since {formatLocalDate(segments[0].fromDate, 'MMM dd, yyyy')} · the belt is
            on the right
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-5">
        {belt.longestReign && (
          <p className="text-caption text-muted-foreground">
            {belt.longestReign.nightsHeld > belt.nightsHeld
              ? `Longest reign on record: ${belt.longestReign.playerName}, ${belt.longestReign.nightsHeld} nights.`
              : `Longest reign on record — ${belt.nightsHeld} ${nightWord} and counting.`}
          </p>
        )}
        <Link
          to="/insights"
          className="inline-flex shrink-0 items-center gap-1.5 text-label font-semibold text-foreground transition-colors hover:text-primary"
        >
          The lineage
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </Card>
  );
};

export default BeltPanel;

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/viz/money';
import { moneySign } from '@/lib/viz/sign';
import type { PlayerSplits, SplitBucket, SplitSummary } from '@/types';

/**
 * Where the money actually goes.
 *
 * Day of week, venue and table size have been sitting in the database since the
 * first night and have never been on a screen. They matter here because they
 * are the rare stat a losing player can win: somebody who is down overall is
 * still the best Thursday player in the group, and that is a sentence worth
 * having.
 *
 * Each bucket is a stroke either side of a centre rule, so "up here, down
 * there" is the shape rather than something you assemble from two columns of
 * digits. Buckets that have not cleared the sample floor are drawn but greyed:
 * they are real nights, they just cannot carry a claim yet.
 */

const DIMENSION_COPY = {
  dayOfWeek: { title: 'By day', question: 'Is there a night of the week that likes them?' },
  venue: { title: 'By room', question: 'Does the table they sit at change anything?' },
  tableSize: { title: 'By table size', question: 'Short-handed or a full house?' },
} as const;

/** The venue bucket for nights with no `location` arrives as the literal "Unspecified". */
const bucketLabel = (summary: SplitSummary, bucket: SplitBucket): string =>
  summary.dimension === 'venue' && bucket.key === 'unspecified' ? 'No venue recorded' : bucket.label;

interface SplitCardProps {
  summary: SplitSummary;
  currency?: string | null;
}

const SplitCard = ({ summary, currency }: SplitCardProps) => {
  const copy = DIMENSION_COPY[summary.dimension];
  const solid = summary.buckets.filter((bucket) => bucket.sessions >= summary.minSessions);
  const thin = summary.buckets.filter((bucket) => bucket.sessions < summary.minSessions);
  // Scale against the buckets that carry a claim, so one freak single night
  // does not flatten every bar that actually means something.
  const peak = Math.max(1, ...(solid.length > 0 ? solid : summary.buckets).map((b) => Math.abs(b.avgProfit)));
  const called = summary.best !== null || summary.worst !== null;

  return (
    <Card className="flex h-full flex-col p-5">
      <h4 className="font-display text-base font-semibold tracking-tight">{copy.title}</h4>
      <p className="mt-0.5 text-label-sm text-muted-foreground">{copy.question}</p>

      {summary.buckets.length === 0 ? (
        <p className="mt-5 text-label-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {solid.map((bucket) => {
            const sign = moneySign(bucket.avgProfit);
            const ratio = Math.min(1, Math.abs(bucket.avgProfit) / peak);
            const width = `${Math.max(2, ratio * 50)}%`;
            return (
              <li key={bucket.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-label-sm font-medium text-foreground">
                    {bucketLabel(summary, bucket)}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-display text-label-sm font-bold tnum',
                      sign === 'profit'
                        ? 'text-profit'
                        : sign === 'loss'
                          ? 'text-loss'
                          : 'text-neutral'
                    )}
                  >
                    {formatMoney(bucket.avgProfit, { currency, signed: true, decimals: 2 })}
                  </span>
                </div>
                <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-surface-3">
                  <span
                    aria-hidden
                    className="absolute inset-y-[-2px] left-1/2 w-px -translate-x-1/2 bg-border-strong"
                  />
                  <span
                    className={cn(
                      'absolute inset-y-0 rounded-full',
                      sign === 'profit' ? 'bg-profit' : sign === 'loss' ? 'bg-loss' : 'bg-neutral'
                    )}
                    style={
                      sign === 'loss'
                        ? { right: '50%', width }
                        : { left: '50%', width: sign === 'neutral' ? '2px' : width }
                    }
                  />
                </div>
                <p className="mt-1 text-caption text-muted-foreground tnum">
                  {bucket.sessions} nights · {bucket.wins} won
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {/* Below the sample floor the average is noise, so it gets a line rather
       * than a bar: still on the card, visibly not a claim. */}
      {thin.length > 0 && (
        <div className={cn('border-t border-border pt-3', solid.length > 0 ? 'mt-4' : 'mt-5')}>
          <p className="eyebrow text-muted-foreground">Too few nights to call</p>
          <ul className="mt-1.5 space-y-1">
            {thin.map((bucket) => (
              <li
                key={bucket.key}
                className="flex items-baseline justify-between gap-3 text-caption text-muted-foreground"
              >
                <span className="truncate">
                  {bucketLabel(summary, bucket)}
                  <span className="tnum">
                    {' '}
                    · {bucket.sessions} {bucket.sessions === 1 ? 'night' : 'nights'}
                  </span>
                </span>
                <span className="shrink-0 tnum">
                  {formatMoney(bucket.avgProfit, { currency, signed: true, decimals: 2 })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.buckets.length > 0 && !called && (
        <p className="mt-auto pt-4 text-caption leading-relaxed text-muted-foreground">
          {summary.minSessions} nights in two of these and this card starts making claims.
        </p>
      )}
    </Card>
  );
};

/**
 * Whether these splits are worth a section at all.
 *
 * A player one night old has exactly one bucket in each dimension, and three
 * cards each reading "Wednesday · 1 night · -$10" is the same fact three times
 * dressed as analysis. A comparison needs two things to compare.
 */
export const hasSplitSignal = (splits: PlayerSplits): boolean =>
  [splits.dayOfWeek, splits.venue, splits.tableSize].some(
    (summary) => summary.buckets.length >= 2
  );

interface PlayerSplitsPanelProps {
  splits: PlayerSplits;
  currency?: string | null;
}

const PlayerSplitsPanel = ({ splits, currency }: PlayerSplitsPanelProps) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <SplitCard summary={splits.dayOfWeek} currency={currency} />
    <SplitCard summary={splits.venue} currency={currency} />
    <SplitCard summary={splits.tableSize} currency={currency} />
  </div>
);

export default PlayerSplitsPanel;

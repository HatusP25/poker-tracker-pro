import { cn } from '@/lib/utils';
import { moneySign } from '@/lib/viz/sign';
import { formatMoney } from '@/lib/viz/money';
import { storyDate } from '@/lib/playerStory';

/**
 * The last few nights, as one line of the card.
 *
 * A shape rather than a chart: each night is a stroke up or down from a centre
 * rule, scaled against this player's own biggest swing. You read a heater or a
 * slump off it in about a quarter of a second, which is exactly the amount of
 * attention a header strip gets.
 *
 * No Recharts — this renders above the fold and is not worth a 400KB chunk.
 */

export interface NightStripNight {
  date: string;
  profit: number;
}

interface NightStripProps {
  /** Chronological, oldest first. Only the tail is drawn. */
  nights: NightStripNight[];
  limit?: number;
  currency?: string | null;
  className?: string;
}

const NightStrip = ({ nights, limit = 14, currency, className }: NightStripProps) => {
  const tail = nights.slice(-limit);
  // Two nights is not a shape. Below that the strip would be one wide slab of
  // colour reading as something far more dramatic than "they lost ten dollars".
  if (tail.length < 3) return null;

  const peak = Math.max(1, ...tail.map((n) => Math.abs(n.profit)));

  return (
    <div className={cn('w-fit max-w-full space-y-2', className)}>
      {/* Fixed-width strokes rather than a full-width stretch: this is a form
       * strip, not a chart, and it should read at a glance from its shape. */}
      <div className="relative flex h-12 items-stretch gap-[3px]">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-border-strong" aria-hidden />
        {tail.map((night, index) => {
          const sign = moneySign(night.profit);
          const ratio = Math.min(1, Math.abs(night.profit) / peak);
          // 6% floor so a $1 night is still a visible mark rather than nothing.
          const height = `${Math.max(6, ratio * 50)}%`;
          return (
            <div
              key={`${night.date}-${index}`}
              className="group relative w-[14px] shrink-0 sm:w-[18px]"
              title={`${storyDate(night.date)} · ${formatMoney(night.profit, { currency, signed: true, decimals: 2 })}`}
            >
              {sign === 'neutral' ? (
                <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-neutral" />
              ) : (
                <span
                  className={cn(
                    'absolute inset-x-0 rounded-[2px] transition-opacity',
                    sign === 'profit' ? 'bottom-1/2 bg-profit' : 'top-1/2 bg-loss'
                  )}
                  style={{ height }}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-caption text-muted-foreground tnum">
        {tail.length === nights.length ? 'Every night so far' : `The last ${tail.length} nights`} ·
        through {storyDate(tail[tail.length - 1].date)}
      </p>
    </div>
  );
};

export default NightStrip;

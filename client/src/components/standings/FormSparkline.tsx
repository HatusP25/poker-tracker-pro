import { cn } from '@/lib/utils';
import Sparkline from '@/components/insights/charts/Sparkline';
import type { StandingsNight } from './standingsRules';

/**
 * The shape of a player's recent nights, in the width of a table column.
 *
 * Wraps the existing `insights/charts/Sparkline` rather than drawing a second
 * one: the app already has exactly one answer for "a tiny profit line", and it
 * should stay one. All this adds is the two things a leaderboard row needs and
 * that component should not have to know about — a fixed footprint, so the
 * column cannot jitter as figures change, and a graceful nothing when there is
 * only a single night, which a line chart cannot draw.
 */

export interface FormSparklineProps {
  nights: readonly StandingsNight[];
  /** How many of the most recent nights to plot. */
  window?: number;
  height?: number;
  className?: string;
}

const FormSparkline = ({ nights, window = 8, height = 34, className }: FormSparklineProps) => {
  const values = nights.slice(-window).map((n) => n.profit);

  if (values.length < 2) {
    return (
      <div
        className={cn('flex items-center text-caption text-muted-foreground', className)}
        style={{ height }}
      >
        {values.length === 1 ? 'One night' : 'No nights'}
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <Sparkline values={values} height={height} />
    </div>
  );
};

export default FormSparkline;

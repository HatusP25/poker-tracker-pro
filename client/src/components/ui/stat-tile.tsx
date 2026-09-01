import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { moneySign, SIGN_TEXT_CLASS, type MoneySign } from '@/lib/viz/sign';

/**
 * One figure with a label. The single most copy-pasted markup in the client —
 * the same eyebrow/value/hint block appears fifteen times across Dashboard,
 * Analytics and PlayerDetail, each with slightly different spacing, and a
 * `StatCardSkeleton` already existed for a component that did not.
 *
 * Pass an already-formatted string as `value` (use `formatMoney` /
 * `formatCount`); the tile decides typography and colour, not rounding.
 */

export type StatTileSize = 'sm' | 'md' | 'lg' | 'hero';

const VALUE_SIZE: Record<StatTileSize, string> = {
  sm: 'text-stat-sm',
  md: 'text-stat',
  lg: 'text-display-4',
  hero: 'text-display-hero',
};

export interface StatTileProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The uppercase micro-heading. Keep it to two or three words. */
  label: React.ReactNode;
  value: React.ReactNode;
  /** A qualifying line under the figure: "across 24 nights", "since October". */
  hint?: React.ReactNode;
  icon?: LucideIcon;
  /**
   * Colours the figure. A number is run through the three-way `moneySign`, so
   * an exact zero renders neutral rather than green. Omit for a plain figure —
   * counts and dates are not signed.
   */
  sign?: number | MoneySign;
  /** Usually a `<DeltaChip>`. Sits beside the figure. */
  delta?: React.ReactNode;
  size?: StatTileSize;
  loading?: boolean;
  /** Renders bare, without the card. For tiles inside an existing panel. */
  plain?: boolean;
}

const StatTile = React.forwardRef<HTMLDivElement, StatTileProps>(
  (
    {
      label,
      value,
      hint,
      icon: Icon,
      sign,
      delta,
      size = 'md',
      loading = false,
      plain = false,
      className,
      ...props
    },
    ref
  ) => {
    const signClass =
      sign === undefined
        ? 'text-foreground'
        : SIGN_TEXT_CLASS[typeof sign === 'number' ? moneySign(sign) : sign];

    const body = loading ? (
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-32" />
        {hint !== undefined && <Skeleton className="h-3 w-40" />}
      </div>
    ) : (
      <>
        <div className="flex items-start justify-between gap-3">
          <span className="eyebrow">{label}</span>
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className={cn('font-display tnum', VALUE_SIZE[size], signClass)}>{value}</span>
          {delta}
        </div>
        {hint && <p className="mt-1.5 text-label-sm text-muted-foreground">{hint}</p>}
      </>
    );

    if (plain) {
      return (
        <div ref={ref} className={cn(className)} {...props}>
          {body}
        </div>
      );
    }

    return (
      <Card ref={ref} className={cn('p-5', className)} {...props}>
        {body}
      </Card>
    );
  }
);
StatTile.displayName = 'StatTile';

export { StatTile };

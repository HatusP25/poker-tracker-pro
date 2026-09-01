import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CHART_HEIGHT, type ChartHeightName } from '@/components/insights/charts/chartTheme';

/**
 * The frame every chart sits in: title, description, a fixed height off the
 * shared scale, and the loading and empty states.
 *
 * Each of the nine charts used to build all of this itself, which is how the
 * app ended up with heights of 300, 320 and 360 chosen one chart at a time,
 * and with empty states that said "No session data available" in five
 * different phrasings.
 *
 * Deliberately imports no Recharts, so it stays out of the 400KB
 * `recharts-vendor` chunk — the caller passes the `<ResponsiveContainer>` in.
 */

export interface ChartFrameProps {
  title: React.ReactNode;
  /** The question this chart answers. A chart without one has not earned its place. */
  description?: React.ReactNode;
  /** Top-right slot: a range picker, a legend toggle. */
  action?: React.ReactNode;
  /** A name off the shared scale, or an explicit pixel height. */
  height?: ChartHeightName | number;
  loading?: boolean;
  /** When true the empty state replaces the plot area. */
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;
  /** A qualifier below the plot: "excludes in-progress nights". */
  footnote?: React.ReactNode;
  /** Renders without the Card, for a chart already inside a panel. */
  bare?: boolean;
  className?: string;
  children: React.ReactNode;
}

const ChartFrame = ({
  title,
  description,
  action,
  height = 'md',
  loading = false,
  isEmpty = false,
  emptyTitle = 'Nothing to chart yet',
  emptyDescription,
  emptyIcon,
  emptyAction,
  footnote,
  bare = false,
  className,
  children,
}: ChartFrameProps) => {
  const px = typeof height === 'number' ? height : CHART_HEIGHT[height];

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h3 className="font-display text-lg font-semibold leading-tight tracking-tight">
            {title}
          </h3>
          {description && <p className="text-label text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* One element owns the height, so the card never resizes between the
       * loading, empty and loaded states. */}
      <div className="mt-5" style={{ height: px }}>
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : isEmpty ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        ) : (
          children
        )}
      </div>

      {footnote && <p className="mt-3 text-caption text-muted-foreground">{footnote}</p>}
    </>
  );

  if (bare) return <div className={className}>{body}</div>;
  return <Card className={cn('p-6', className)}>{body}</Card>;
};

export { ChartFrame };

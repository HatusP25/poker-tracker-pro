import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/viz/money';
import { moneyTextClass } from '@/lib/viz/sign';

/**
 * The one chart tooltip.
 *
 * There were six of these — `CustomTooltip` in MoneyRaceChart,
 * PlayerComparisonChart, PlayerProfitChart, PlayerSessionHistoryChart,
 * ProfitByLocationChart and SessionSizeChart — near-identical, every one of
 * them typed `any`, and each colouring values with a two-way `>= 0` check that
 * painted a break-even night green.
 *
 * Pass it to Recharts as an element and it receives `active`/`payload`/`label`
 * by cloning:
 *
 *   <Tooltip content={<ChartTooltip currency={group.currency} />} />
 */

/** The shape Recharts hands a custom tooltip. Narrowed from `any` to what is actually read. */
export interface ChartTooltipItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  /** Injected by Recharts. */
  active?: boolean;
  /** Injected by Recharts. */
  payload?: ChartTooltipItem[];
  /** Injected by Recharts. */
  label?: string | number;

  /** Renders the header. Defaults to the raw label — pass a date formatter. */
  labelFormatter?: (label: string | number) => React.ReactNode;
  /** Renders each value. Defaults to signed money in the group's currency. */
  valueFormatter?: (value: number, item: ChartTooltipItem) => React.ReactNode;
  /** ISO code from `group.currency`. Ignored when `valueFormatter` is supplied. */
  currency?: string | null;
  /** Colour values by sign. On for money, off for counts. */
  signed?: boolean;
  /** Biggest first — what all six hand-rolled versions did. */
  sort?: 'desc' | 'asc' | 'none';
  /** Keep a nine-player hover from becoming a wall. Extra rows collapse to a count. */
  max?: number;
  /** Suppress zero/absent series, so a player who had not joined yet is not listed. */
  hideEmpty?: boolean;
  className?: string;
}

const numeric = (value: number | string | undefined): number =>
  typeof value === 'number' ? value : Number(value ?? 0);

const ChartTooltip = ({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  currency,
  signed = true,
  sort = 'desc',
  max,
  hideEmpty = false,
  className,
}: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  let rows = payload.filter((item) => item.value !== undefined && item.value !== null);
  if (hideEmpty) rows = rows.filter((item) => numeric(item.value) !== 0);
  if (rows.length === 0) return null;

  if (sort !== 'none') {
    // A copy: Recharts owns `payload`, and two components in this codebase
    // already sort query-cache arrays in place.
    rows = [...rows].sort((a, b) =>
      sort === 'desc' ? numeric(b.value) - numeric(a.value) : numeric(a.value) - numeric(b.value)
    );
  }

  const hidden = max !== undefined && rows.length > max ? rows.length - max : 0;
  const shown = hidden > 0 ? rows.slice(0, max) : rows;

  const renderValue = (item: ChartTooltipItem) => {
    const value = numeric(item.value);
    if (valueFormatter) return valueFormatter(value, item);
    return formatMoney(value, { currency, signed });
  };

  return (
    <div
      className={cn(
        'min-w-[10rem] rounded-md border border-border-strong bg-surface-3 px-3 py-2 shadow-elev-3',
        className
      )}
    >
      {label !== undefined && (
        <p className="mb-1.5 font-display text-label-sm font-semibold text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <ul className="space-y-1">
        {shown.map((item, i) => (
          <li
            key={`${String(item.dataKey ?? item.name ?? i)}`}
            className="flex items-center justify-between gap-4 text-label-sm"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {item.color && (
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="truncate text-muted-foreground">{item.name ?? item.dataKey}</span>
            </span>
            <span
              className={cn(
                'shrink-0 font-display font-semibold tnum',
                // Three-way: an exact zero is neutral, not a win.
                signed ? moneyTextClass(numeric(item.value)) : 'text-foreground'
              )}
            >
              {renderValue(item)}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="mt-1.5 text-caption text-muted-foreground">+{hidden} more</p>
      )}
    </div>
  );
};

export { ChartTooltip };

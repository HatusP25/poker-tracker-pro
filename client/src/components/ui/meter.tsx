import * as React from 'react';
import { cn } from '@/lib/utils';
import { moneySign, type MoneySign } from '@/lib/viz/sign';

/**
 * A proportion, drawn as a bar.
 *
 * For attendance rates, win shares, "you have played 31 of 44 nights" — the
 * kind of figure that means nothing as a bare percentage and everything as a
 * length. Deliberately not a chart: no axes, no library, no lazy chunk.
 *
 * A diverging profit/loss bar (negative left of a centre line) belongs in the
 * chart layer, not here.
 */

const SIGN_FILL: Record<MoneySign, string> = {
  profit: 'bg-profit',
  loss: 'bg-loss',
  neutral: 'bg-neutral',
};

export interface MeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  value: number;
  max?: number;
  /** Sits above the bar, left. */
  label?: React.ReactNode;
  /** Sits above the bar, right — the figure itself, already formatted. */
  valueLabel?: React.ReactNode;
  /**
   * A number is run through the three-way `moneySign`. A `MoneySign` is used
   * directly. Omit for the brand fill, which is the right default for a
   * neutral proportion like attendance.
   */
  sign?: number | MoneySign;
  /** An explicit CSS colour — pass `playerColor(id)` for a per-player bar. */
  color?: string;
  size?: 'sm' | 'md';
  /** Fills from its origin on mount. Off inside long scrolling lists. */
  animate?: boolean;
}

const Meter = React.forwardRef<HTMLDivElement, MeterProps>(
  (
    {
      value,
      max = 1,
      label,
      valueLabel,
      sign,
      color,
      size = 'md',
      animate = false,
      className,
      ...props
    },
    ref
  ) => {
    const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
    const safeValue = Number.isFinite(value) ? value : 0;
    const ratio = Math.min(1, Math.max(0, safeValue / safeMax));

    const fillClass = color
      ? undefined
      : sign === undefined
        ? 'bg-primary'
        : SIGN_FILL[typeof sign === 'number' ? moneySign(sign) : sign];

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {(label || valueLabel) && (
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            {label && <span className="eyebrow truncate">{label}</span>}
            {valueLabel && (
              <span className="font-display text-label-sm font-semibold tnum">{valueLabel}</span>
            )}
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={safeValue}
          aria-valuemin={0}
          aria-valuemax={safeMax}
          className={cn(
            'w-full overflow-hidden rounded-full bg-surface-3',
            size === 'sm' ? 'h-1.5' : 'h-2.5'
          )}
        >
          <div
            className={cn('h-full rounded-full origin-left', fillClass, animate && 'animate-sweep')}
            style={{ width: `${ratio * 100}%`, ...(color ? { backgroundColor: color } : null) }}
          />
        </div>
      </div>
    );
  }
);
Meter.displayName = 'Meter';

export { Meter };

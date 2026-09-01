import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { moneySign, SIGN_TEXT_CLASS, SIGN_TINT_CLASS, type MoneySign } from '@/lib/viz/sign';
import { formatMoney } from '@/lib/viz/money';

/**
 * A signed change: money by default, anything with a `format` override.
 *
 * Three-way throughout — a zero delta is a flat dash in --neutral, not an
 * upward arrow in green. "No change" is a real answer and the app should be
 * able to say it.
 */

const ICON: Record<MoneySign, typeof Minus> = {
  profit: ArrowUpRight,
  loss: ArrowDownRight,
  neutral: Minus,
};

export interface DeltaChipProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number;
  /**
   * Defaults to signed money. Override for non-money deltas:
   * `format={(v) => `${v > 0 ? '+' : ''}${v} places`}`
   */
  format?: (value: number) => string;
  /** ISO code from `group.currency`. Ignored when `format` is supplied. */
  currency?: string | null;
  /** `tint` is a filled pill; `plain` is bare coloured text for dense rows. */
  variant?: 'tint' | 'plain';
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

const DeltaChip = React.forwardRef<HTMLSpanElement, DeltaChipProps>(
  (
    {
      value,
      format,
      currency,
      variant = 'tint',
      size = 'sm',
      showIcon = true,
      className,
      ...props
    },
    ref
  ) => {
    const sign = moneySign(value);
    const Icon = ICON[sign];
    const text = format
      ? format(value)
      : formatMoney(value, { currency, signed: true });

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-display font-semibold tnum whitespace-nowrap',
          size === 'sm' ? 'text-caption' : 'text-label',
          variant === 'tint'
            ? cn(SIGN_TINT_CLASS[sign], size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1')
            : SIGN_TEXT_CLASS[sign],
          className
        )}
        {...props}
      >
        {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />}
        {text}
      </span>
    );
  }
);
DeltaChip.displayName = 'DeltaChip';

export { DeltaChip };

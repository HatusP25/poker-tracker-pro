import { AlertTriangle, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/viz';

interface BalanceIndicatorProps {
  totalBuyIn: number;
  totalCashOut: number;
  threshold?: number;
  currency?: string | null;
  className?: string;
}

/**
 * Does the money on the table add up?
 *
 * This is a correctness read-out, not decoration: it must keep saying exactly
 * what it said before — buy-in, cash-out, and the difference — because it is
 * how someone catches a mistyped cash-out before the settlement is computed.
 * What changed is the volume. A balanced night is the normal case and no longer
 * shouts in green; an unbalanced one keeps a loud, loss-toned frame, because
 * that is the one you must not scroll past.
 */
const BalanceIndicator = ({
  totalBuyIn,
  totalCashOut,
  threshold = 1,
  currency,
  className,
}: BalanceIndicatorProps) => {
  const difference = Math.abs(totalBuyIn - totalCashOut);
  const isBalanced = difference <= threshold;
  const money = (value: number) => formatMoney(value, { currency, decimals: 2 });

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border px-4 py-3',
        isBalanced ? 'border-border bg-surface-2/60' : 'border-loss/50 bg-loss-tint',
        className
      )}
      data-testid="balance-indicator"
    >
      <span className="flex items-center gap-2">
        {isBalanced ? (
          <Scale className="h-4 w-4 shrink-0 text-profit" aria-hidden />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-loss" aria-hidden />
        )}
        <span
          className={cn(
            'font-display text-label font-semibold',
            isBalanced ? 'text-foreground' : 'text-loss'
          )}
        >
          {isBalanced ? 'Session balanced' : 'Session unbalanced'}
        </span>
      </span>

      <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label-sm text-muted-foreground tnum">
        <span>
          <span className="eyebrow mr-1.5">In</span>
          {money(totalBuyIn)}
        </span>
        <span>
          <span className="eyebrow mr-1.5">Out</span>
          {money(totalCashOut)}
        </span>
        <span className={cn(!isBalanced && 'font-semibold text-loss')}>
          <span className="eyebrow mr-1.5">Diff</span>
          {money(difference)}
        </span>
      </span>
    </div>
  );
};

export default BalanceIndicator;

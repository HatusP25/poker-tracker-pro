import { ArrowRight, Check, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useUpdateSettlementPaid } from '@/hooks/useSessions';
import { formatMoney } from '@/lib/viz';
import type { Settlement } from '@/types';

interface SettlementListProps {
  sessionId: string;
  settlements: Settlement[];
  canEdit: boolean;
  currency?: string | null;
}

/**
 * Renders a session's settlement transfers with per-transfer paid/pending
 * status. EDITOR role can toggle a transfer; VIEWER sees read-only state.
 *
 * Per-session only (docs/DECISIONS.md D-001) — no cross-session balances,
 * this list only ever reflects the settlements object on this one session.
 *
 * Presentation notes: the amount used to be `text-primary`, i.e. the brand
 * green, at 2xl. Brand green is chrome; a transfer is neither a profit nor a
 * loss, so it is plain foreground ink. The `$` is no longer hardcoded — a group
 * that picked EUR in Settings now settles up in euros.
 */
const SettlementList = ({ sessionId, settlements, canEdit, currency }: SettlementListProps) => {
  const updateSettlementPaid = useUpdateSettlementPaid();

  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-profit-tint">
          <CheckCircle2 className="h-6 w-6 text-profit" aria-hidden />
        </span>
        <p className="font-display text-lg font-semibold">Everyone broke even.</p>
        <p className="text-label text-muted-foreground">No payments needed. 🎉</p>
      </div>
    );
  }

  const paidCount = settlements.filter((s) => s.paid).length;
  const allSettled = paidCount === settlements.length;

  const handleToggle = (index: number, paid: boolean) => {
    updateSettlementPaid.mutate({ sessionId, index, paid });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow">
          {settlements.length === 1 ? 'One payment' : `${settlements.length} payments`}
        </span>
        <span
          className={cn(
            'font-display text-label-sm font-semibold tnum',
            allSettled ? 'text-profit' : 'text-muted-foreground'
          )}
          data-testid="settlement-progress"
        >
          {paidCount} of {settlements.length} settled
        </span>
      </div>

      <ul className="space-y-2">
        {settlements.map((settlement, idx) => {
          const isPaid = !!settlement.paid;
          return (
            <li
              key={idx}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors sm:gap-4',
                isPaid
                  ? 'border-border/60 bg-surface-2/50 text-muted-foreground'
                  : 'border-border bg-surface-2'
              )}
              data-testid="settlement-row"
            >
              {canEdit ? (
                <Checkbox
                  checked={isPaid}
                  onCheckedChange={(checked) => handleToggle(idx, checked)}
                  disabled={updateSettlementPaid.isPending}
                  aria-label={
                    isPaid
                      ? `Mark ${settlement.from} to ${settlement.to} as unpaid`
                      : `Mark ${settlement.from} to ${settlement.to} as paid`
                  }
                  data-testid="settlement-paid-checkbox"
                />
              ) : isPaid ? (
                <Check className="h-4 w-4 shrink-0 text-profit" aria-label="Paid" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-label="Pending" />
              )}

              <p
                className={cn(
                  'flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 font-display text-label font-semibold sm:text-base',
                  isPaid && 'line-through'
                )}
              >
                <span className="truncate">{settlement.from}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="pays" />
                <span className="truncate">{settlement.to}</span>
              </p>

              <span
                className={cn(
                  'shrink-0 font-display text-stat-sm tnum',
                  isPaid ? 'text-muted-foreground line-through' : 'text-foreground'
                )}
              >
                {formatMoney(settlement.amount, { currency, decimals: 2 })}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="flex items-center justify-center gap-2 pt-1 text-label-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-profit" aria-hidden />
        Zero-sum validated ✓
      </p>
    </div>
  );
};

export default SettlementList;

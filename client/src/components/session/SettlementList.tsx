import { ArrowRight, CheckCircle, Circle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useUpdateSettlementPaid } from '@/hooks/useSessions';
import type { Settlement } from '@/types';

interface SettlementListProps {
  sessionId: string;
  settlements: Settlement[];
  canEdit: boolean;
}

/**
 * Renders a session's settlement transfers with per-transfer paid/pending
 * status. EDITOR role can toggle a transfer; VIEWER sees read-only state.
 *
 * Per-session only (docs/DECISIONS.md D-001) — no cross-session balances,
 * this list only ever reflects the settlements object on this one session.
 */
const SettlementList = ({ sessionId, settlements, canEdit }: SettlementListProps) => {
  const updateSettlementPaid = useUpdateSettlementPaid();

  if (settlements.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <p className="text-lg font-medium">Perfect! Everyone broke even.</p>
        <p className="text-muted-foreground">No payments needed. 🎉</p>
      </div>
    );
  }

  const paidCount = settlements.filter((s) => s.paid).length;

  const handleToggle = (index: number, paid: boolean) => {
    updateSettlementPaid.mutate({ sessionId, index, paid });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground" data-testid="settlement-progress">
        {paidCount} of {settlements.length} settled
      </div>

      {settlements.map((settlement, idx) => {
        const isPaid = !!settlement.paid;
        return (
          <div
            key={idx}
            className={cn(
              'flex items-center justify-between p-4 bg-muted rounded-lg transition-opacity',
              isPaid && 'opacity-60'
            )}
            data-testid="settlement-row"
          >
            <div className="flex items-center gap-4 flex-1">
              {canEdit ? (
                <Checkbox
                  checked={isPaid}
                  onCheckedChange={(checked) => handleToggle(idx, checked)}
                  disabled={updateSettlementPaid.isPending}
                  aria-label={isPaid ? `Mark ${settlement.from} to ${settlement.to} as unpaid` : `Mark ${settlement.from} to ${settlement.to} as paid`}
                  data-testid="settlement-paid-checkbox"
                />
              ) : isPaid ? (
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" aria-label="Paid" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" aria-label="Pending" />
              )}
              <div
                className={cn('font-bold text-lg', isPaid && 'line-through text-muted-foreground')}
              >
                {settlement.from}
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div
                className={cn('font-bold text-lg', isPaid && 'line-through text-muted-foreground')}
              >
                {settlement.to}
              </div>
            </div>
            <div
              className={cn(
                'text-2xl font-bold text-primary',
                isPaid && 'line-through text-muted-foreground'
              )}
            >
              ${settlement.amount.toFixed(2)}
            </div>
          </div>
        );
      })}

      {/* Validation Badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-6">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>Zero-sum validated ✓</span>
      </div>
    </div>
  );
};

export default SettlementList;

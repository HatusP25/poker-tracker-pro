import { AlertCircle, CheckCircle } from 'lucide-react';

interface BalanceIndicatorProps {
  totalBuyIn: number;
  totalCashOut: number;
  threshold?: number;
}

const BalanceIndicator = ({ totalBuyIn, totalCashOut, threshold = 1 }: BalanceIndicatorProps) => {
  const difference = Math.abs(totalBuyIn - totalCashOut);
  const isBalanced = difference <= threshold;

  return (
    <div
      className={`p-4 rounded-lg border ${
        isBalanced
          ? 'bg-green-500/10 border-green-500/50'
          : 'bg-destructive/10 border-destructive/50'
      }`}
    >
      <div className="flex items-center gap-3">
        {isBalanced ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
        <div className="flex-1">
          <h4 className="font-medium">
            {isBalanced ? 'Session Balanced' : 'Session Unbalanced'}
          </h4>
          <div className="text-sm text-muted-foreground mt-1">
            <div className="flex gap-4">
              <span>Total Buy-In: ${totalBuyIn.toFixed(2)}</span>
              <span>Total Cash-Out: ${totalCashOut.toFixed(2)}</span>
              <span className={difference > threshold ? 'text-destructive font-medium' : ''}>
                Difference: ${difference.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceIndicator;

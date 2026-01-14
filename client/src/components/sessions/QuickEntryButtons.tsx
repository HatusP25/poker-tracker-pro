import { Button } from '@/components/ui/button';

interface QuickEntryButtonsProps {
  amounts: number[];
  onAmountClick: (amount: number) => void;
}

const QuickEntryButtons = ({ amounts, onAmountClick }: QuickEntryButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {amounts.map((amount) => (
        <Button
          key={amount}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAmountClick(amount)}
        >
          ${amount}
        </Button>
      ))}
    </div>
  );
};

export default QuickEntryButtons;

import { Button } from '@/components/ui/button';

export type DateRange = '7d' | '30d' | '90d' | 'all';

interface DateRangeSelectorProps {
  selected: DateRange;
  onChange: (range: DateRange) => void;
}

const DateRangeSelector = ({ selected, onChange }: DateRangeSelectorProps) => {
  const ranges: { value: DateRange; label: string }[] = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex gap-2">
      {ranges.map((range) => (
        <Button
          key={range.value}
          variant={selected === range.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(range.value)}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
};

export default DateRangeSelector;

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TREND_RANGES, type TrendRange } from '@/lib/trends';

/**
 * The window the time charts are measured over.
 *
 * Replaces `DateRangeSelector`, which sat in a non-wrapping flex beside a
 * `text-3xl` page title and pushed four side-by-side buttons off the right edge
 * of every phone. It is also honest about its reach now: it is rendered inside
 * the "Over time" section and only the two charts in that section read it.
 */

interface RangeToggleProps {
  value: TrendRange;
  onChange: (range: TrendRange) => void;
}

const RangeToggle = ({ value, onChange }: RangeToggleProps) => (
  <Tabs value={value} onValueChange={(next) => onChange(next as TrendRange)}>
    <TabsList aria-label="Date range" className="w-full sm:w-auto">
      {TREND_RANGES.map((range) => (
        <TabsTrigger
          key={range.value}
          value={range.value}
          className="px-2.5 py-1.5 text-label-sm sm:px-3"
        >
          <span className="hidden md:inline">{range.label}</span>
          <span className="md:hidden">{range.short}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

export default RangeToggle;

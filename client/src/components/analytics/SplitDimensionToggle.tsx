import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SPLIT_DIMENSIONS } from '@/components/analytics/SplitMatrix';
import type { SplitDimension } from '@/types';

/**
 * Which split the grid is showing.
 *
 * Sits in the section heading rather than the card's own header: at 390px a
 * three-segment control in the top-right corner squeezed "Where the money
 * lands" into four lines.
 */

interface SplitDimensionToggleProps {
  value: SplitDimension;
  onChange: (dimension: SplitDimension) => void;
}

const SplitDimensionToggle = ({ value, onChange }: SplitDimensionToggleProps) => (
  <Tabs value={value} onValueChange={(next) => onChange(next as SplitDimension)}>
    <TabsList aria-label="Split by" className="w-full sm:w-auto">
      {SPLIT_DIMENSIONS.map(({ value: dimension, label, short, icon: Icon }) => (
        <TabsTrigger
          key={dimension}
          value={dimension}
          className="px-2.5 py-1.5 text-label-sm sm:px-3"
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="hidden md:inline">{label}</span>
          <span className="md:hidden">{short}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
)

export default SplitDimensionToggle;

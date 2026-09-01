import { ArrowDownWideNarrow, ArrowUpNarrowWide, Download, Rows3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SORTS, TIMEFRAMES, scopeValue, type SortDirection, type StandingsSortKey } from './standingsRules';
import type { Season } from '@/types';

/**
 * What the board is showing, and how it is sorted.
 *
 * Scope is one control rather than two: the four built-in ranges and every
 * season the group has defined go in a single picker, because "this year" and
 * "Winter 2025/26" answer the same question and asking the user which *kind*
 * of window they want first would be a menu about the implementation.
 *
 * Sort is deliberately a picker and not clickable column headers. Headers are
 * where the old table went wrong — it sorted on click but kept printing the
 * server's rank, so the numbering desynchronised. Making the ordering an
 * explicit, visible choice means the board can always state what it is ranked
 * by, right under the sort control.
 */

export interface StandingsControlsProps {
  scope: string;
  onScopeChange: (value: string) => void;
  seasons: Season[] | undefined;

  sort: StandingsSortKey;
  onSortChange: (value: StandingsSortKey) => void;
  direction: SortDirection;
  onDirectionToggle: () => void;

  showDetail: boolean;
  onDetailToggle: () => void;
  /** Off shows everyone, including players under the minimum-nights floor. */
  qualifiedOnly: boolean;
  onQualifiedToggle: () => void;
  minGames: number;

  onExport: () => void;
  canExport: boolean;
  className?: string;
}

const toggleVariant = (active: boolean) => (active ? 'secondary' : 'outline');

const StandingsControls = ({
  scope,
  onScopeChange,
  seasons,
  sort,
  onSortChange,
  direction,
  onDirectionToggle,
  showDetail,
  onDetailToggle,
  qualifiedOnly,
  onQualifiedToggle,
  minGames,
  onExport,
  canExport,
  className,
}: StandingsControlsProps) => {
  const DirectionIcon = direction === 'desc' ? ArrowDownWideNarrow : ArrowUpNarrowWide;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select value={scope} onValueChange={onScopeChange}>
        <SelectTrigger className="h-9 w-[9.5rem] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Range</SelectLabel>
            {TIMEFRAMES.map(([timeframe, label]) => (
              <SelectItem key={timeframe} value={scopeValue({ kind: 'timeframe', timeframe })}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
          {seasons && seasons.length > 0 && (
            <SelectGroup>
              <SelectLabel>Seasons</SelectLabel>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={scopeValue({ kind: 'season', season })}>
                  {season.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>

      <div className="flex shrink-0 items-center gap-1">
        <Select value={sort} onValueChange={(v) => onSortChange(v as StandingsSortKey)}>
          <SelectTrigger className="h-9 w-[8.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onDirectionToggle}
          aria-label={direction === 'desc' ? 'Sort ascending' : 'Sort descending'}
          title={direction === 'desc' ? 'Highest first' : 'Lowest first'}
        >
          <DirectionIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          variant={toggleVariant(qualifiedOnly)}
          size="sm"
          onClick={onQualifiedToggle}
          aria-pressed={qualifiedOnly}
          title={
            qualifiedOnly
              ? `Only players with ${minGames} or more nights are ranked`
              : 'Everyone who played is ranked, however few nights'
          }
        >
          <ShieldCheck className="h-4 w-4" />
          <span className="hidden sm:inline">
            {qualifiedOnly ? `${minGames}+ nights` : 'Everyone'}
          </span>
        </Button>

        <Button
          variant={toggleVariant(showDetail)}
          size="sm"
          onClick={onDetailToggle}
          aria-pressed={showDetail}
          title="Show per-night, win rate, best night and ROI"
        >
          <Rows3 className="h-4 w-4" />
          <span className="hidden sm:inline">Detail</span>
        </Button>

        <Button variant="outline" size="sm" onClick={onExport} disabled={!canExport}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </div>
    </div>
  );
};

export default StandingsControls;

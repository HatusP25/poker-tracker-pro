import { OTHERS_COLOR, assignPlayerColors, playerColor } from './playerColor';

/**
 * How many series a chart is allowed to draw before the tail gets bucketed.
 *
 * The old palette held eight colours and nothing checked the roster size, so
 * players nine and up silently reused colours — two lines the same shade, no
 * indication anything had been dropped. Nine marks is about the honest limit
 * for a legend anyone actually reads, so: eight named plus one bucket.
 */
export const DEFAULT_SERIES_CAP = 8;

export const OTHERS_ID = '__others__';

export interface SeriesInput {
  id: string;
  label: string;
  /** What "biggest" means for this chart — profit, sessions, pot. Sorted by magnitude. */
  weight: number;
}

export interface SeriesEntry extends SeriesInput {
  color: string;
  isOthers: boolean;
  /** Ids folded into this entry: one for a player, many for the bucket. */
  memberIds: string[];
}

export interface CapSeriesOptions {
  max?: number;
  /** A canonical roster map, when the caller has one. Otherwise derived from the input. */
  colors?: Record<string, string>;
  othersLabel?: (count: number) => string;
}

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

export function capSeries(
  items: readonly SeriesInput[],
  options: CapSeriesOptions = {}
): SeriesEntry[] {
  const { max = DEFAULT_SERIES_CAP, colors, othersLabel = (n) => `${n} others` } = options;
  if (items.length === 0) return [];

  const ranked = [...items].sort(
    (a, b) =>
      Math.abs(finite(b.weight)) - Math.abs(finite(a.weight)) || a.label.localeCompare(b.label)
  );

  // Colours come from the *whole* input, never the visible slice, so a player
  // who is ninth this month and third next month keeps the same colour.
  const palette = colors ?? assignPlayerColors(items.map((item) => item.id));
  const toEntry = (item: SeriesInput): SeriesEntry => ({
    id: item.id,
    label: item.label,
    weight: finite(item.weight),
    color: palette[item.id] ?? playerColor(item.id),
    isOthers: false,
    memberIds: [item.id],
  });

  // A bucket holding one series is strictly worse than just drawing it.
  if (ranked.length <= max + 1) return ranked.map(toEntry);

  const tail = ranked.slice(max);
  return [
    ...ranked.slice(0, max).map(toEntry),
    {
      id: OTHERS_ID,
      label: othersLabel(tail.length),
      weight: tail.reduce((sum, item) => sum + finite(item.weight), 0),
      color: OTHERS_COLOR,
      isOthers: true,
      memberIds: tail.map((item) => item.id),
    },
  ];
}

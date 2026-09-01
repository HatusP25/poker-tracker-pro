import { toColor, readCssVar } from '@/lib/viz/cssVar';
import { PLAYER_PALETTE, OTHERS_COLOR } from '@/lib/viz/playerColor';
import { formatMoney } from '@/lib/viz/money';

/**
 * The chart layer's theme.
 *
 * Was a ten-line object of hardcoded hexes that three of the nine charts
 * actually imported — the other six pasted the identical values inline. Worse,
 * its neutrals were Tailwind *gray* (#374151 / #9CA3AF / #6B7280) while the
 * entire rest of the app is *slate*, so every chart read as a foreign object
 * dropped into the page.
 *
 * Colours now resolve from the CSS custom properties in index.css, which makes
 * the tokens the single source for both the DOM and the charts. Recharts wants
 * a finished colour string on a `stroke` or `fill` prop and `var()` is not
 * reliably honoured inside SVG presentation attributes, so the variables are
 * read once and handed over as concrete values.
 */

export interface ChartTheme {
  /** Furniture */
  grid: string;
  axis: string;
  zero: string;
  /** Semantic money — same three tokens the DOM uses */
  profit: string;
  loss: string;
  neutral: string;
  /** Surfaces, for tooltips and reference bands */
  surface: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  /**
   * The categorical scale for multi-player charts. Perceptually spaced and
   * clear of the profit and loss hue arcs, so `series[0]` can no longer be
   * the positive colour — which it literally was (#10B981).
   */
  series: readonly string[];
  /** The "+N others" bucket from lib/viz/series.ts. */
  others: string;
}

/** Used before the stylesheet resolves, and under `environment: node` in tests. */
const FALLBACK: ChartTheme = {
  grid: 'hsl(217 26% 21%)',
  axis: 'hsl(215 18% 58%)',
  zero: 'hsl(216 20% 38%)',
  profit: 'hsl(158 64% 52%)',
  loss: 'hsl(0 84% 67%)',
  neutral: 'hsl(214 20% 65%)',
  surface: 'hsl(217 30% 20%)',
  border: 'hsl(217 28% 22%)',
  foreground: 'hsl(210 40% 98%)',
  mutedForeground: 'hsl(215 20% 68%)',
  series: PLAYER_PALETTE,
  others: OTHERS_COLOR,
};

let cached: ChartTheme | null = null;

/**
 * Resolve the theme from the DOM, once. The tokens never change at runtime —
 * the app is dark-only with no toggle — so a single read is enough, and
 * `getComputedStyle` is far too expensive to run per render.
 */
export function resolveChartTheme(): ChartTheme {
  if (cached) return cached;
  if (typeof document === 'undefined') return FALLBACK;

  const pick = (name: string, fallback: string) => toColor(readCssVar(name), fallback);
  const theme: ChartTheme = {
    grid: pick('--chart-grid', FALLBACK.grid),
    axis: pick('--chart-axis', FALLBACK.axis),
    zero: pick('--chart-zero', FALLBACK.zero),
    profit: pick('--profit', FALLBACK.profit),
    loss: pick('--loss', FALLBACK.loss),
    neutral: pick('--neutral', FALLBACK.neutral),
    surface: pick('--surface-3', FALLBACK.surface),
    border: pick('--border', FALLBACK.border),
    foreground: pick('--foreground', FALLBACK.foreground),
    mutedForeground: pick('--muted-foreground', FALLBACK.mutedForeground),
    series: PLAYER_PALETTE.map((fallbackColor, i) => pick(`--player-${i}`, fallbackColor)),
    others: pick('--player-others', FALLBACK.others),
  };

  // Only latch once the stylesheet has actually landed; before that the read
  // returns nothing and we would cache the fallbacks forever.
  if (readCssVar('--profit')) cached = theme;
  return theme;
}

/** Test seam. */
export const resetChartTheme = () => {
  cached = null;
};

/**
 * Heights were 300 / 320 / 360, chosen one chart at a time, so a nine-line
 * Money Race got the same room as a three-bar location chart. A chart is sized
 * by how much it has to say.
 */
export const CHART_HEIGHT = {
  /** An inline trend beside a figure. */
  sm: 200,
  /** A supporting chart in a grid. */
  md: 280,
  /** The chart that answers the page's question. */
  lg: 360,
  /** The one chart a page is built around. */
  hero: 460,
} as const;

export type ChartHeightName = keyof typeof CHART_HEIGHT;

/** Recharts margins. `default` assumes a Y axis; `tight` assumes neither axis. */
export const CHART_MARGIN = {
  tight: { top: 4, right: 4, bottom: 0, left: 0 },
  default: { top: 8, right: 16, bottom: 8, left: 0 },
  roomy: { top: 16, right: 24, bottom: 16, left: 8 },
} as const;

/** Axis styling, so every axis in the app is the same axis. */
export const axisProps = (theme: ChartTheme) => ({
  stroke: theme.axis,
  tickLine: false,
  axisLine: false,
  style: { fontSize: '11px', fontVariantNumeric: 'tabular-nums' as const },
});

export const gridProps = (theme: ChartTheme) => ({
  stroke: theme.grid,
  strokeDasharray: '3 3',
  vertical: false,
});

/* ------------------------------------------------------------------------ *
 * Legacy
 *
 * `CHART` predates the tokens. Its `positive` and `negative` are still the
 * exact hexes `lib/shareCard.ts` composes PNGs from — those render outside the
 * DOM, where CSS custom properties do not exist, and their values are asserted
 * byte-for-byte by shareCard.test.ts. Leave them alone.
 *
 * The furniture keys below now point at the slate tokens, matching the rest of
 * the app. New charts should use `resolveChartTheme()`; the remaining
 * consumers (Sparkline, RankRaceChart, BeltTimeline, MoneyRaceChart) migrate
 * as they are rebuilt, and this block goes away with the last of them.
 * ------------------------------------------------------------------------ */
export const CHART = {
  grid: FALLBACK.grid,
  axis: FALLBACK.axis,
  zeroLine: FALLBACK.zero,
  /** Share-card ink. Not the DOM's profit/loss — use `--profit` / `--loss`. */
  positive: '#10B981',
  negative: '#EF4444',
  series: PLAYER_PALETTE,
};

/** @deprecated Index-keyed colour reassigns whenever the roster changes. Use `playerColor(id)`. */
export const colorForIndex = (i: number) => PLAYER_PALETTE[i % PLAYER_PALETTE.length];

/** @deprecated Hardcodes `$`. Use `formatMoney(value, { currency })`. */
export const formatCurrency = (value: number) => formatMoney(value);

/** @deprecated Hardcodes `$`. Use `formatMoney(value, { currency, signed: true })`. */
export const formatSignedCurrency = (value: number) => formatMoney(value, { signed: true });

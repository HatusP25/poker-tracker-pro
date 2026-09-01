/**
 * The visualisation layer's pure logic: colour, sign, money, series shaping.
 *
 * Everything here is a plain function over plain data — no React, no DOM (bar
 * the one guarded reader in cssVar), no Recharts — so it is unit-testable and
 * shared by the DOM and the charts alike. Components live in
 * `components/ui/` and `components/ui/chart/`.
 */

export {
  PLAYER_PALETTE,
  OTHERS_COLOR,
  playerColor,
  playerColorIndex,
  assignPlayerColors,
} from './playerColor';

export { moneySign, moneyTextClass, moneyTintClass, MONEY_EPSILON, SIGN_TEXT_CLASS, SIGN_TINT_CLASS, SIGN_VAR } from './sign';
export type { MoneySign } from './sign';

export { formatMoney, formatPercent, formatCount, COMPACT_FLOOR } from './money';
export type { MoneyFormatOptions, PercentOptions } from './money';

export { capSeries, DEFAULT_SERIES_CAP, OTHERS_ID } from './series';
export type { SeriesInput, SeriesEntry, CapSeriesOptions } from './series';

export { toColor, readCssVar, cssColor } from './cssVar';

import { getCurrencySymbol } from '@/lib/nightMessage';

/**
 * The one money formatter.
 *
 * Settings lets a group pick EUR, GBP or BRL, and every stats surface printed
 * "$" anyway. Currency comes from `group.currency` and flows through here.
 *
 * Conventions, matching `nightMessage.ts` and `shareCard.ts` so the app, the
 * WhatsApp text and the share image never disagree:
 *   - the sign sits outside the symbol: `-$40`, not `$-40`
 *   - a zero is never signed, however it arrived (see lib/viz/sign.ts)
 */

export interface MoneyFormatOptions {
  /** ISO code from `group.currency` (e.g. "USD", "EUR"). Falls back to "$". */
  currency?: string | null;
  /** Prefix positives with "+". Zero stays unsigned regardless. */
  signed?: boolean;
  /** Fraction digits. 0 for headline figures, 2 where the cents are load-bearing. */
  decimals?: number;
  /** Abbreviate figures at or above the compact floor: `$12.5k`, `$1.25M`. */
  compact?: boolean;
}

/**
 * Below this, compaction is a downgrade — a $1,200 pot is an ordinary night in
 * a home game and "$1.2k" throws away a digit that people care about.
 */
export const COMPACT_FLOOR = 10_000;

const UNITS: ReadonlyArray<readonly [number, string]> = [
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'k'],
];

const trimZeros = (text: string): string =>
  text.includes('.') ? text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : text;

const compactBody = (abs: number): string => {
  for (const [divisor, suffix] of UNITS) {
    // The 0.9995 slack promotes 999,999 to "1M" instead of "1000k".
    if (abs >= divisor * 0.9995) {
      const scaled = abs / divisor;
      const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      return trimZeros(scaled.toFixed(decimals)) + suffix;
    }
  }
  return abs.toFixed(0);
};

export function formatMoney(value: number, options: MoneyFormatOptions = {}): string {
  const { currency, signed = false, decimals = 0, compact = false } = options;
  const symbol = getCurrencySymbol(currency ?? undefined);
  const safe = Number.isFinite(value) ? (value as number) : 0;
  const abs = Math.abs(safe);

  const body =
    compact && abs >= COMPACT_FLOOR
      ? compactBody(abs)
      : abs.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });

  // Decide the sign from what will actually be *printed*, not from the input.
  // -0.004 formats as "0", so it must not carry a minus.
  const isZero = !/[1-9]/.test(body);
  const prefix = isZero ? '' : safe < 0 ? '-' : signed ? '+' : '';

  return `${prefix}${symbol}${body}`;
}

export interface PercentOptions {
  decimals?: number;
  /** Shown when the ratio is undefined — a rate over zero games, typically. */
  fallback?: string;
}

/**
 * A 0..1 ratio as a percent. `PlayerDetail` divided by `totalGames` with no
 * zero guard and rendered "NaN%"; passing that NaN through here yields "—".
 */
export function formatPercent(ratio: number, options: PercentOptions = {}): string {
  const { decimals = 0, fallback = '—' } = options;
  if (!Number.isFinite(ratio)) return fallback;
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** A count — sessions, nights, rebuys. Grouped, integral, never NaN. */
export const formatCount = (value: number): string =>
  (Number.isFinite(value) ? Math.round(value) : 0).toLocaleString('en-US');

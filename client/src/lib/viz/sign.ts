/**
 * The sign of a money figure — three-way, not two-way.
 *
 * Every profit check in the client was `>= 0`, so a player who broke even
 * exactly rendered in the same green as a player who won $200. `shareCard.ts`
 * already got this right for the images the app posts (`profitColor`, line 54);
 * this is the DOM's copy of that rule, and the only place the decision is made.
 */

export type MoneySign = 'profit' | 'loss' | 'neutral';

/**
 * Half a cent. Anything inside this band renders as "$0.00", so it must not
 * be coloured as a win or a loss — settlement maths leaves sub-cent residue.
 */
export const MONEY_EPSILON = 0.005;

export function moneySign(value: number, epsilon: number = MONEY_EPSILON): MoneySign {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'neutral';
  if (value > epsilon) return 'profit';
  if (value < -epsilon) return 'loss';
  return 'neutral';
}

/** Ink only. Semantic money is never a large filled block — that is the brand green. */
export const SIGN_TEXT_CLASS: Record<MoneySign, string> = {
  profit: 'text-profit',
  loss: 'text-loss',
  neutral: 'text-neutral',
};

/** The chip treatment: an opaque wash with a matching foreground. */
export const SIGN_TINT_CLASS: Record<MoneySign, string> = {
  profit: 'bg-profit-tint text-profit',
  loss: 'bg-loss-tint text-loss',
  neutral: 'bg-neutral-tint text-neutral',
};

/** The CSS custom property behind each sign, for the chart layer. */
export const SIGN_VAR: Record<MoneySign, string> = {
  profit: '--profit',
  loss: '--loss',
  neutral: '--neutral',
};

export const moneyTextClass = (value: number, epsilon?: number): string =>
  SIGN_TEXT_CLASS[moneySign(value, epsilon)];

export const moneyTintClass = (value: number, epsilon?: number): string =>
  SIGN_TINT_CLASS[moneySign(value, epsilon)];

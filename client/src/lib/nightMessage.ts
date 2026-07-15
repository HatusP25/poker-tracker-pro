import { format } from 'date-fns';
import { parseLocalDate } from './dateUtils';
import type { NightTitle, Settlement } from '@/types';

// Mirrors the currency options offered in Settings (client/src/pages/Settings.tsx).
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  CAD: '$',
  AUD: '$',
  MXN: '$',
  ARS: '$',
  EUR: '€',
  GBP: '£',
  BRL: 'R$',
};

/** Resolves a group's stored currency code (e.g. "USD") to its display symbol. */
export const getCurrencySymbol = (currencyCode: string | undefined | null): string =>
  (currencyCode && CURRENCY_SYMBOLS[currencyCode]) || '$';

export interface NightMessageResult {
  name: string;
  profit: number;
  titles: NightTitle[];
}

export interface NightMessageInput {
  date: string; // ISO date of the session
  currency: string; // currency symbol to prefix amounts with (e.g. "$", "€")
  results: NightMessageResult[];
  settlements: Settlement[];
  belt?: { line: string };
}

const formatSigned = (amount: number, currency: string): string =>
  `${amount >= 0 ? '+' : '-'}${currency}${Math.abs(amount).toFixed(0)}`;

const formatAmount = (amount: number, currency: string): string =>
  `${currency}${Math.abs(amount).toFixed(0)}`;

/**
 * Renders one player's result line. Players holding a title get the title's
 * emoji as a prefix instead of the plain 4-space indent; every title except
 * "shark" also gets its label appended in parentheses (shark is self-evident
 * from being the top positive profit, so it needs no extra text).
 */
const formatResultLine = (result: NightMessageResult, currency: string): string => {
  const signed = formatSigned(result.profit, currency);
  if (result.titles.length === 0) {
    return `    ${result.name} ${signed}`;
  }
  const prefix = result.titles[0].emoji;
  const labels = result.titles.filter((t) => t.id !== 'shark').map((t) => t.label);
  const suffix = labels.length > 0 ? ` (${labels.join(', ')})` : '';
  return `${prefix} ${result.name} ${signed}${suffix}`;
};

export function formatNightMessage(input: NightMessageInput): string {
  const { date, currency, results, settlements, belt } = input;

  const sortedResults = [...results].sort(
    (a, b) => b.profit - a.profit || a.name.localeCompare(b.name)
  );

  const headerBlock = [
    `🃏 Poker Night — ${format(parseLocalDate(date), 'EEE MMM d')}`,
    ...sortedResults.map((r) => formatResultLine(r, currency)),
  ];

  const blocks: string[][] = [headerBlock];

  if (settlements.length > 0) {
    blocks.push([
      '💰 Settle up:',
      ...settlements.map((s) => `${s.from} → ${s.to} ${formatAmount(s.amount, currency)}`),
    ]);
  }

  if (belt) {
    blocks.push([`🥇 The Belt: ${belt.line}`]);
  }

  return blocks.map((block) => block.join('\n')).join('\n\n');
}

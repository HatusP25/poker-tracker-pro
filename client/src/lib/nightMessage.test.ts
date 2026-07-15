import { describe, it, expect } from 'vitest';
import { formatNightMessage, getCurrencySymbol } from './nightMessage';
import type { NightTitle } from '@/types';

const sharkTitle: NightTitle = { id: 'shark', label: 'Shark of the Night', emoji: '🦈', playerId: 'p1', playerName: 'Marcus' };
const donationTitle: NightTitle = { id: 'donation', label: 'Donation of the Night', emoji: '💸', playerId: 'p4', playerName: 'Pete' };

describe('formatNightMessage', () => {
  it('formats the full example from the design spec', () => {
    const message = formatNightMessage({
      date: '2026-07-10',
      currency: '$',
      results: [
        { name: 'Marcus', profit: 120, titles: [sharkTitle] },
        { name: 'Dani', profit: 15, titles: [] },
        { name: 'Alex', profit: -40, titles: [] },
        { name: 'Pete', profit: -95, titles: [donationTitle] },
      ],
      settlements: [
        { from: 'Pete', to: 'Marcus', amount: 95 },
        { from: 'Alex', to: 'Marcus', amount: 25 },
        { from: 'Alex', to: 'Dani', amount: 15 },
      ],
      belt: { line: 'Marcus defends (4th defense)' },
    });

    expect(message).toBe(
      [
        '🃏 Poker Night — Fri Jul 10',
        '🦈 Marcus +$120',
        '    Dani +$15',
        '    Alex -$40',
        '💸 Pete -$95 (Donation of the Night)',
        '',
        '💰 Settle up:',
        'Pete → Marcus $95',
        'Alex → Marcus $25',
        'Alex → Dani $15',
        '',
        '🥇 The Belt: Marcus defends (4th defense)',
      ].join('\n')
    );
  });

  it('omits emoji/label lines when no player holds a title', () => {
    const message = formatNightMessage({
      date: '2026-07-10',
      currency: '$',
      results: [
        { name: 'Marcus', profit: 50, titles: [] },
        { name: 'Dani', profit: -50, titles: [] },
      ],
      settlements: [{ from: 'Dani', to: 'Marcus', amount: 50 }],
    });

    expect(message).toBe(
      [
        '🃏 Poker Night — Fri Jul 10',
        '    Marcus +$50',
        '    Dani -$50',
        '',
        '💰 Settle up:',
        'Dani → Marcus $50',
      ].join('\n')
    );
  });

  it('omits the belt section entirely when no belt line is provided', () => {
    const message = formatNightMessage({
      date: '2026-07-10',
      currency: '$',
      results: [
        { name: 'Marcus', profit: 50, titles: [sharkTitle] },
        { name: 'Dani', profit: -50, titles: [] },
      ],
      settlements: [{ from: 'Dani', to: 'Marcus', amount: 50 }],
    });

    expect(message).not.toContain('The Belt');
    expect(message.endsWith('Dani → Marcus $50')).toBe(true);
  });

  it('omits the settle-up section entirely when there are no settlements', () => {
    const message = formatNightMessage({
      date: '2026-07-10',
      currency: '$',
      results: [
        { name: 'Marcus', profit: 0, titles: [] },
        { name: 'Dani', profit: 0, titles: [] },
      ],
      settlements: [],
      belt: { line: 'Marcus defends (5th defense)' },
    });

    expect(message).not.toContain('Settle up');
    expect(message).toBe(
      [
        '🃏 Poker Night — Fri Jul 10',
        '    Dani +$0',
        '    Marcus +$0',
        '',
        '🥇 The Belt: Marcus defends (5th defense)',
      ].join('\n')
    );
  });

  it('sorts results by profit descending regardless of input order', () => {
    const message = formatNightMessage({
      date: '2026-07-10',
      currency: '$',
      results: [
        { name: 'Alex', profit: -40, titles: [] },
        { name: 'Marcus', profit: 120, titles: [sharkTitle] },
        { name: 'Dani', profit: 15, titles: [] },
      ],
      settlements: [],
    });

    const lines = message.split('\n');
    expect(lines[1]).toContain('Marcus');
    expect(lines[2]).toContain('Dani');
    expect(lines[3]).toContain('Alex');
  });

  it('uses the provided currency symbol for both profits and settlements', () => {
    const message = formatNightMessage({
      date: '2026-07-10',
      currency: '€',
      results: [{ name: 'Marcus', profit: 10, titles: [] }],
      settlements: [{ from: 'Dani', to: 'Marcus', amount: 10 }],
    });

    expect(message).toContain('€10');
    expect(message).not.toContain('$10');
  });
});

describe('getCurrencySymbol', () => {
  it('maps known currency codes to their symbol', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('EUR')).toBe('€');
    expect(getCurrencySymbol('GBP')).toBe('£');
    expect(getCurrencySymbol('BRL')).toBe('R$');
  });

  it('falls back to "$" for unknown or missing currency codes', () => {
    expect(getCurrencySymbol('XYZ')).toBe('$');
    expect(getCurrencySymbol(undefined)).toBe('$');
    expect(getCurrencySymbol(null)).toBe('$');
  });
});

import { describe, it, expect } from 'vitest';
import {
  calculateSettlements,
  calculateSessionSettlements,
  validateSettlements,
  validateZeroSum,
} from './settlementService';

describe('calculateSettlements', () => {
  it('settles a simple two-player game in one transaction', () => {
    const settlements = calculateSettlements([
      { playerId: 'a', playerName: 'Alice', balance: 50 },
      { playerId: 'b', playerName: 'Bob', balance: -50 },
    ]);
    expect(settlements).toEqual([{ from: 'Bob', to: 'Alice', amount: 50 }]);
  });

  it('minimizes transactions and stays zero-sum across many players', () => {
    const balances = [
      { playerId: 'a', playerName: 'Alice', balance: 100 },
      { playerId: 'b', playerName: 'Bob', balance: -60 },
      { playerId: 'c', playerName: 'Carol', balance: -40 },
      { playerId: 'd', playerName: 'Dave', balance: 30 },
      { playerId: 'e', playerName: 'Eve', balance: -30 },
    ];
    const settlements = calculateSettlements(balances);

    // Every settlement is a positive transfer.
    for (const s of settlements) expect(s.amount).toBeGreaterThan(0);

    // Net effect reconciles every player's balance.
    const net = new Map<string, number>();
    for (const b of balances) net.set(b.playerName, 0);
    for (const s of settlements) {
      net.set(s.from, (net.get(s.from) ?? 0) - s.amount);
      net.set(s.to, (net.get(s.to) ?? 0) + s.amount);
    }
    for (const b of balances) {
      expect(net.get(b.playerName)!).toBeCloseTo(b.balance, 2);
    }
  });

  it('returns no settlements when everyone is even', () => {
    expect(
      calculateSettlements([
        { playerId: 'a', playerName: 'Alice', balance: 0 },
        { playerId: 'b', playerName: 'Bob', balance: 0 },
      ])
    ).toEqual([]);
  });
});

describe('validateZeroSum', () => {
  it('accepts balances that sum to zero', () => {
    expect(
      validateZeroSum([
        { playerId: 'a', playerName: 'Alice', balance: 50 },
        { playerId: 'b', playerName: 'Bob', balance: -50 },
      ])
    ).toBe(true);
  });
  it('rejects balances that do not sum to zero', () => {
    expect(
      validateZeroSum([
        { playerId: 'a', playerName: 'Alice', balance: 50 },
        { playerId: 'b', playerName: 'Bob', balance: -40 },
      ])
    ).toBe(false);
  });
});

describe('validateSettlements', () => {
  const balances = [
    { playerId: 'a', playerName: 'Alice', balance: 50 },
    { playerId: 'b', playerName: 'Bob', balance: -50 },
  ];

  it('confirms a correct settlement set reconciles the balances', () => {
    const settlements = calculateSettlements(balances);
    expect(validateSettlements(balances, settlements)).toBe(true);
  });

  it('rejects a settlement set that does NOT reconcile the balances', () => {
    // Wrong amount — Bob underpays. A correct validator must catch this.
    const bad = [{ from: 'Bob', to: 'Alice', amount: 30 }];
    expect(validateSettlements(balances, bad)).toBe(false);
  });

  it('rejects a settlement that pays the wrong direction', () => {
    const bad = [{ from: 'Alice', to: 'Bob', amount: 50 }];
    expect(validateSettlements(balances, bad)).toBe(false);
  });
});

describe('calculateSessionSettlements', () => {
  it('derives balances from entries and settles them', () => {
    const settlements = calculateSessionSettlements([
      { playerId: 'a', playerName: 'Alice', buyIn: 100, cashOut: 150 },
      { playerId: 'b', playerName: 'Bob', buyIn: 100, cashOut: 50 },
    ]);
    expect(settlements).toEqual([{ from: 'Bob', to: 'Alice', amount: 50 }]);
  });

  it('throws a typed, descriptive error when the table is not zero-sum', () => {
    expect(() =>
      calculateSessionSettlements([
        { playerId: 'a', playerName: 'Alice', buyIn: 100, cashOut: 150 },
        { playerId: 'b', playerName: 'Bob', buyIn: 100, cashOut: 60 },
      ])
    ).toThrow(/zero-sum|reconcile|balance/i);
  });
});

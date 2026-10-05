import { describe, it, expect } from 'vitest';
import { resolveStartBuyIns, refreshSelectedGroup } from './liveStartBuyIns';
import type { Group } from '@/types';

describe('resolveStartBuyIns', () => {
  it('turns valid drafts into numeric buy-ins', () => {
    const result = resolveStartBuyIns({ a: '20', b: '12.5' });
    expect(result.errors).toEqual({});
    expect(result.players).toEqual([
      { playerId: 'a', buyIn: 20 },
      { playerId: 'b', buyIn: 12.5 },
    ]);
  });

  it('flags an erased (empty) buy-in instead of dropping it', () => {
    const result = resolveStartBuyIns({ a: '', b: '10' });
    expect(result.errors.a).toBe('Enter a buy-in amount');
    expect(result.errors.b).toBeUndefined();
  });

  it('flags zero, negative and over-cap buy-ins', () => {
    const result = resolveStartBuyIns({ a: '0', b: '-5', c: '5000' });
    expect(Object.keys(result.errors).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('refreshSelectedGroup', () => {
  const stale: Group = {
    id: 'g1',
    name: 'Friday Night',
    defaultBuyIn: 5,
    currency: 'USD',
  } as Group;

  it('adopts the fresh server copy when the default buy-in changed', () => {
    const fresh = { ...stale, defaultBuyIn: 20 };
    expect(refreshSelectedGroup(stale, fresh)).toBe(fresh);
  });

  it('keeps the same object when nothing relevant changed (no re-render loop)', () => {
    expect(refreshSelectedGroup(stale, { ...stale })).toBe(stale);
  });

  it('ignores a fresh copy of a different group', () => {
    expect(refreshSelectedGroup(stale, { ...stale, id: 'g2', defaultBuyIn: 50 })).toBe(stale);
  });

  it('keeps the current group while the fresh copy is still loading', () => {
    expect(refreshSelectedGroup(stale, undefined)).toBe(stale);
  });
});

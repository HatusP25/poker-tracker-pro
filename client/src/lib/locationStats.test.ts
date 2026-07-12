import { describe, it, expect } from 'vitest';
import { aggregateProfitByLocation } from './locationStats';

describe('aggregateProfitByLocation', () => {
  it('groups sessions case-insensitively and trims whitespace', () => {
    const result = aggregateProfitByLocation([
      { location: "John's House", entries: [{ buyIn: 50 }, { buyIn: 50 }] },
      { location: "  john's house  ", entries: [{ buyIn: 30 }] },
      { location: "JOHN'S HOUSE", entries: [{ buyIn: 20 }] },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].location).toBe("John's House");
    expect(result[0].sessions).toBe(3);
    expect(result[0].totalPot).toBe(150);
    expect(result[0].avgPot).toBe(50);
  });

  it('buckets empty, null, and whitespace-only locations as Unspecified', () => {
    const result = aggregateProfitByLocation([
      { location: null, entries: [{ buyIn: 40 }] },
      { location: '', entries: [{ buyIn: 20 }] },
      { location: '   ', entries: [{ buyIn: 10 }] },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].location).toBe('Unspecified');
    expect(result[0].sessions).toBe(3);
    expect(result[0].totalPot).toBe(70);
  });

  it('treats missing entries as a zero pot', () => {
    const result = aggregateProfitByLocation([{ location: 'Casino' }]);

    expect(result[0].totalPot).toBe(0);
    expect(result[0].avgPot).toBe(0);
  });

  it('sorts locations by total pot descending', () => {
    const result = aggregateProfitByLocation([
      { location: 'Small Game', entries: [{ buyIn: 20 }] },
      { location: 'Big Game', entries: [{ buyIn: 200 }] },
      { location: 'Medium Game', entries: [{ buyIn: 80 }] },
    ]);

    expect(result.map((r) => r.location)).toEqual(['Big Game', 'Medium Game', 'Small Game']);
  });

  it('returns an empty array for no sessions', () => {
    expect(aggregateProfitByLocation([])).toEqual([]);
  });
});

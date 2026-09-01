import { describe, it, expect } from 'vitest';
import { capSeries, DEFAULT_SERIES_CAP, OTHERS_ID } from './series';
import { OTHERS_COLOR, assignPlayerColors } from './playerColor';

const input = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, label: `P${i}`, weight: 100 - i }));

describe('capSeries', () => {
  it('returns everything when the roster is under the cap', () => {
    const out = capSeries(input(5));
    expect(out).toHaveLength(5);
    expect(out.some((s) => s.isOthers)).toBe(false);
  });

  it('orders by magnitude, so the biggest movers are drawn first', () => {
    const out = capSeries([
      { id: 'a', label: 'A', weight: 10 },
      { id: 'b', label: 'B', weight: -90 },
      { id: 'c', label: 'C', weight: 50 },
    ]);
    expect(out.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('breaks magnitude ties on label, so ordering is never arbitrary', () => {
    const out = capSeries([
      { id: 'z', label: 'Zoe', weight: 20 },
      { id: 'a', label: 'Ana', weight: -20 },
    ]);
    expect(out.map((s) => s.id)).toEqual(['a', 'z']);
  });

  it('buckets the tail once there are more series than the chart can carry', () => {
    const out = capSeries(input(20), { max: 4 });
    expect(out).toHaveLength(5);
    expect(out[4].isOthers).toBe(true);
    expect(out[4].id).toBe(OTHERS_ID);
    expect(out[4].memberIds).toHaveLength(16);
    expect(out[4].color).toBe(OTHERS_COLOR);
  });

  it('sums the bucketed weights', () => {
    const out = capSeries(
      [
        { id: 'a', label: 'A', weight: 100 },
        { id: 'b', label: 'B', weight: 5 },
        { id: 'c', label: 'C', weight: 3 },
        { id: 'd', label: 'D', weight: 2 },
      ],
      { max: 1 }
    );
    expect(out[1].weight).toBe(10);
  });

  it('does not create an Others bucket holding a single series', () => {
    // Hiding one player behind "Others" is strictly worse than drawing them.
    const out = capSeries(input(5), { max: 4 });
    expect(out).toHaveLength(5);
    expect(out.some((s) => s.isOthers)).toBe(false);
  });

  it('labels the bucket with how many it swallowed', () => {
    const out = capSeries(input(12), { max: 4 });
    expect(out[4].label).toBe('8 others');
    expect(capSeries(input(6), { max: 4 })[4].label).toBe('2 others');
  });

  it('caps at eight series by default — nine marks is the readable limit', () => {
    expect(DEFAULT_SERIES_CAP).toBe(8);
    const out = capSeries(input(30));
    expect(out).toHaveLength(DEFAULT_SERIES_CAP + 1);
  });

  it('colours from the full roster, so capping never moves a colour', () => {
    // A player who is 9th this month and 3rd next month must keep their colour.
    const all = input(20);
    const expected = assignPlayerColors(all.map((i) => i.id));
    for (const s of capSeries(all, { max: 4 })) {
      if (!s.isOthers) expect(s.color).toBe(expected[s.id]);
    }
  });

  it('accepts an explicit colour map from a canonical roster', () => {
    const out = capSeries(input(3), { colors: { p1: 'hsl(1 2% 3%)' } });
    expect(out.find((s) => s.id === 'p1')!.color).toBe('hsl(1 2% 3%)');
  });

  it('handles an empty series list', () => {
    expect(capSeries([])).toEqual([]);
  });

  it('ignores non-finite weights rather than sorting NaN to the front', () => {
    const out = capSeries([
      { id: 'a', label: 'A', weight: NaN },
      { id: 'b', label: 'B', weight: 5 },
    ]);
    expect(out.map((s) => s.id)).toEqual(['b', 'a']);
    expect(out[1].weight).toBe(0);
  });
});

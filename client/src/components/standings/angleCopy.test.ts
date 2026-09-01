import { describe, it, expect } from 'vitest';
import {
  ROW_REDUNDANT_ANGLES,
  angleSentence,
  assignStoryAngles,
  pickStoryAngle,
} from './angleCopy';
import type { PlayerAngles, StoryAngle, StoryAngleId } from '@/types';

const angle = (id: StoryAngleId, over: Partial<StoryAngle> = {}): StoryAngle => ({
  id,
  family: 'career',
  tone: 'neutral',
  score: 50,
  value: 0,
  unit: 'count',
  comparisonValue: null,
  label: null,
  subject: null,
  sessionId: null,
  date: null,
  sampleSize: 10,
  fallback: false,
  ...over,
});

const usd = { currency: 'USD' };

// ---- The sentences ----------------------------------------------------------

describe('angleSentence', () => {
  it('writes every angle id the server can return', () => {
    const ids: StoryAngleId[] = [
      'nemesis',
      'favourite-victim',
      'attendance-streak',
      'attendance-rate',
      'gone-missing',
      'drought',
      'never-won',
      'best-day',
      'worst-day',
      'best-venue',
      'worst-venue',
      'best-table-size',
      'worst-table-size',
      'rebuy-dollars',
      'played-together',
      'career-night',
      'night-rank',
      'heater',
      'slump',
      'early-exit',
      'career-balance',
      'newcomer',
      'never-played',
    ];
    for (const id of ids) {
      const text = angleSentence(
        angle(id, {
          value: 4,
          comparisonValue: 9,
          label: 'Friday',
          subject: { playerId: 'p2', playerName: 'Dan' },
          date: '2026-02-23T00:00:00.000Z',
        }),
        usd
      );
      expect(text, id).toBeTruthy();
      expect(text, id).not.toContain('undefined');
      expect(text, id).not.toContain('NaN');
    }
  });

  it('names the rival in a rivalry', () => {
    const text = angleSentence(
      angle('nemesis', {
        value: 13,
        comparisonValue: 19,
        subject: { playerId: 'p2', playerName: 'Lucho' },
      }),
      usd
    );
    expect(text).toBe('Lucho has won 13 of their 19 nights together');
  });

  it('says "never missed one" when the streak is the whole history', () => {
    expect(angleSentence(angle('attendance-streak', { value: 22, comparisonValue: 22 }), usd)).toBe(
      'Has never missed a night — all 22 of them'
    );
    expect(angleSentence(angle('attendance-streak', { value: 7, comparisonValue: 22 }), usd)).toBe(
      'Seven nights in a row without missing one'
    );
  });

  it('honours the group currency instead of hardcoding a dollar sign', () => {
    const text = angleSentence(angle('rebuy-dollars', { value: 140, comparisonValue: 23 }), {
      currency: 'EUR',
    });
    expect(text).toBe('€140 of rebuys across 23 trips back to the table');
  });

  it('does not call an unlabelled venue "Unspecified"', () => {
    const text = angleSentence(
      angle('worst-venue', { value: -11.43, comparisonValue: 4.14, label: 'Unspecified' }),
      usd
    );
    expect(text).not.toContain('Unspecified');
    expect(text).toContain('no venue');
  });

  it('reads a night rank as an ordinal', () => {
    expect(
      angleSentence(angle('night-rank', { value: 3, comparisonValue: 19, unit: 'rank' }), usd)
    ).toBe('Their last night ranked 3rd best of 19');
    expect(
      angleSentence(angle('night-rank', { value: 1, comparisonValue: 12, unit: 'rank' }), usd)
    ).toContain('best night of their 12');
  });

  it('dates a drought by when the last win actually was', () => {
    const text = angleSentence(
      angle('drought', { value: 7, date: '2026-01-25T00:00:00.000Z' }),
      usd
    );
    expect(text).toBe('No win in seven nights — the last was 25 Jan');
  });

  it('is honest about a losing career balance', () => {
    expect(angleSentence(angle('career-balance', { value: -55, comparisonValue: 19 }), usd)).toBe(
      '-$55 across 19 nights'
    );
  });
});

// ---- Choosing which angle to show -------------------------------------------

describe('pickStoryAngle', () => {
  it('skips what the row already shows', () => {
    const picked = pickStoryAngle([
      angle('career-balance', { score: 90, fallback: true }),
      angle('slump', { score: 80, family: 'form' }),
      angle('drought', { score: 40, family: 'drought' }),
    ]);
    expect(picked?.id).toBe('drought');
  });

  it('lists the angles a standings row makes redundant', () => {
    expect(ROW_REDUNDANT_ANGLES).toContain('career-balance');
    expect(ROW_REDUNDANT_ANGLES).toContain('heater');
    expect(ROW_REDUNDANT_ANGLES).toContain('slump');
  });

  it('would rather repeat the row than say nothing', () => {
    const picked = pickStoryAngle([angle('career-balance', { score: 90, fallback: true })]);
    expect(picked?.id).toBe('career-balance');
  });

  it('prefers an earned angle to the guaranteed fallback', () => {
    const picked = pickStoryAngle([
      angle('newcomer', { score: 95, fallback: true }),
      angle('gone-missing', { score: 20, family: 'attendance' }),
    ]);
    expect(picked?.id).toBe('gone-missing');
  });

  it('returns nothing for a player with no angles at all', () => {
    expect(pickStoryAngle([])).toBeNull();
  });

  it('honours an explicit exclusion', () => {
    const picked = pickStoryAngle(
      [angle('drought', { score: 60 }), angle('nemesis', { score: 50 })],
      { taken: new Set<StoryAngleId>(['drought']) }
    );
    expect(picked?.id).toBe('nemesis');
  });
});

describe('assignStoryAngles', () => {
  const player = (playerId: string, angles: StoryAngle[]): PlayerAngles =>
    ({ playerId, playerName: playerId, angles }) as PlayerAngles;

  it('spreads the angles so the board does not say the same thing five times', () => {
    const assigned = assignStoryAngles(
      ['a', 'b', 'c'],
      [
        player('a', [angle('rebuy-dollars', { score: 90 }), angle('drought', { score: 10 })]),
        player('b', [angle('rebuy-dollars', { score: 80 }), angle('nemesis', { score: 20 })]),
        player('c', [angle('rebuy-dollars', { score: 70 }), angle('gone-missing', { score: 30 })]),
      ]
    );
    expect([assigned.a?.id, assigned.b?.id, assigned.c?.id]).toEqual([
      'rebuy-dollars',
      'nemesis',
      'gone-missing',
    ]);
  });

  it('reuses an angle rather than leaving a player with nothing', () => {
    const assigned = assignStoryAngles(
      ['a', 'b'],
      [
        player('a', [angle('drought', { score: 90 })]),
        player('b', [angle('drought', { score: 80 })]),
      ]
    );
    expect(assigned.b?.id).toBe('drought');
  });

  it('gives whoever is first in the order first pick', () => {
    const roster = [
      player('a', [angle('nemesis', { score: 10 }), angle('drought', { score: 5 })]),
      player('b', [angle('nemesis', { score: 99 })]),
    ];
    // The champion is handed first, so the leader gets the angle they scored best on.
    expect(assignStoryAngles(['a', 'b'], roster).a?.id).toBe('nemesis');
    expect(assignStoryAngles(['b', 'a'], roster).b?.id).toBe('nemesis');
    expect(assignStoryAngles(['b', 'a'], roster).a?.id).toBe('drought');
  });

  it('is empty for a player the angles payload has never heard of', () => {
    expect(assignStoryAngles(['ghost'], [])).toEqual({});
  });
});

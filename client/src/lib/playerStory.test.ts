import { describe, it, expect } from 'vitest';
import {
  ALL_STORY_ANGLE_IDS,
  angleCopy,
  ordinal,
  pickStory,
  recordShares,
  storyName,
} from './playerStory';
import type { StoryAngle, StoryAngleId } from '@/types';

/** A minimal angle; every test overrides only what its case is about. */
const angle = (over: Partial<StoryAngle> & { id: StoryAngleId }): StoryAngle => ({
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
  sampleSize: 1,
  fallback: false,
  ...over,
});

const ctx = { name: 'Muel', currency: 'USD' };

describe('storyName', () => {
  it('prefers a nickname, because that is what the group actually calls them', () => {
    expect(storyName({ name: 'Ana Lopez', nickname: 'The Closer' })).toBe('The Closer');
  });

  it('falls back to the first name — a story sentence does not want a surname', () => {
    expect(storyName({ name: 'Ana Lopez' })).toBe('Ana');
    expect(storyName({ name: 'Muel', nickname: '  ' })).toBe('Muel');
  });

  it('ignores a nickname that is just the name again', () => {
    expect(storyName({ name: 'Muel', nickname: 'muel' })).toBe('Muel');
  });

  it('never returns an empty string', () => {
    expect(storyName({ name: '   ' })).toBe('This player');
  });
});

describe('ordinal', () => {
  it('handles the teens, which are the ones everybody gets wrong', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '101st',
    ]);
  });
});

describe('angleCopy — every angle produces a sentence', () => {
  it('covers every id the server can emit', () => {
    for (const id of ALL_STORY_ANGLE_IDS) {
      const copy = angleCopy(
        angle({
          id,
          value: 7,
          comparisonValue: 12,
          label: 'Friday',
          sampleSize: 5,
          date: '2026-01-25T00:00:00.000Z',
          subject: { playerId: 'p2', playerName: 'Lucho' },
        }),
        ctx
      );
      expect(copy.sentence.length, id).toBeGreaterThan(10);
      expect(copy.eyebrow.length, id).toBeGreaterThan(0);
      expect(copy.figure.length, id).toBeGreaterThan(0);
      // The failure mode that matters: a template hole rendering as a hole.
      for (const text of [copy.eyebrow, copy.figure, copy.sentence, copy.kicker ?? '']) {
        expect(text, `${id}: ${text}`).not.toMatch(/undefined|null|NaN|\[object/);
      }
    }
  });

  it('names the player in the sentence — this is the whole point of the surface', () => {
    for (const id of ALL_STORY_ANGLE_IDS) {
      const copy = angleCopy(
        angle({ id, value: 4, comparisonValue: 9, label: 'Friday', sampleSize: 4 }),
        ctx
      );
      expect(copy.sentence, id).toContain('Muel');
    }
  });

  it('survives an id it has never heard of rather than rendering nothing', () => {
    const copy = angleCopy(angle({ id: 'brand-new-angle' as StoryAngleId, value: 3 }), ctx);
    expect(copy.sentence).toContain('Muel');
    expect(copy.fallback).toBe(true);
  });
});

describe('angleCopy — the sentences', () => {
  it('writes the nemesis as a head-to-head record', () => {
    const copy = angleCopy(
      angle({
        id: 'nemesis',
        tone: 'burn',
        value: 13,
        comparisonValue: 19,
        subject: { playerId: 'p2', playerName: 'Lucho' },
      }),
      ctx
    );
    expect(copy.sentence).toBe(
      'Lucho has finished ahead of Muel on 13 of their 19 nights together.'
    );
    expect(copy.figure).toBe('13/19');
    expect(copy.figureSign).toBe('loss');
  });

  it('flips the same sentence for a favourite victim', () => {
    const copy = angleCopy(
      angle({
        id: 'favourite-victim',
        tone: 'brag',
        value: 11,
        comparisonValue: 16,
        subject: { playerId: 'p3', playerName: 'Rauw' },
      }),
      ctx
    );
    expect(copy.sentence).toBe(
      'Muel has finished ahead of Rauw on 11 of their 16 nights together.'
    );
    expect(copy.figureSign).toBe('profit');
  });

  it('dates the drought off the last win', () => {
    const copy = angleCopy(
      angle({
        id: 'drought',
        tone: 'burn',
        value: 7,
        date: '2026-01-25T00:00:00.000Z',
        sessionId: 's1',
      }),
      ctx
    );
    expect(copy.sentence).toBe(
      'Muel has not finished a night up since Jan 25, 2026 — that is 7 nights ago.'
    );
    expect(copy.sessionId).toBe('s1');
  });

  it('says perfect attendance out loud when the streak is every night there was', () => {
    const copy = angleCopy(
      angle({ id: 'attendance-streak', tone: 'brag', value: 22, comparisonValue: 22 }),
      ctx
    );
    expect(copy.sentence).toBe("Muel has been at every single one of the group's 22 nights.");
    expect(copy.kicker).toBe('Perfect attendance. Not one night off.');
  });

  it('counts a partial attendance streak instead', () => {
    const copy = angleCopy(
      angle({ id: 'attendance-streak', tone: 'brag', value: 7, comparisonValue: 22 }),
      ctx
    );
    expect(copy.sentence).toBe('Muel has turned up 7 nights in a row.');
  });

  it('calls a break-even career dead even rather than printing a signed zero', () => {
    const copy = angleCopy(
      angle({ id: 'career-balance', tone: 'neutral', value: 0, comparisonValue: 14, fallback: true }),
      { name: 'Hatus', currency: 'USD' }
    );
    expect(copy.sentence).toBe('Hatus is dead even across 14 nights of poker.');
    expect(copy.sentence).not.toMatch(/\$/);
    expect(copy.figureSign).toBe('neutral');
  });

  it('signs a winning and a losing career', () => {
    expect(
      angleCopy(
        angle({ id: 'career-balance', tone: 'brag', value: 91, comparisonValue: 22 }),
        { name: 'Lucho' }
      ).sentence
    ).toBe('Lucho is +$91 across 22 nights of poker.');
    expect(
      angleCopy(angle({ id: 'career-balance', tone: 'burn', value: -55, comparisonValue: 19 }), ctx)
        .sentence
    ).toBe('Muel is -$55 across 19 nights of poker.');
  });

  it('never prints the raw "Unspecified" venue bucket at a reader', () => {
    for (const id of ['best-venue', 'worst-venue'] as StoryAngleId[]) {
      const copy = angleCopy(
        angle({ id, value: 7.5, comparisonValue: -2.89, label: 'Unspecified', sampleSize: 4 }),
        ctx
      );
      expect(copy.sentence, id).not.toContain('Unspecified');
      expect(copy.kicker ?? '', id).not.toContain('Unspecified');
      expect(copy.sentence, id).toContain('venue');
    }
  });

  it('uses a named venue directly', () => {
    const copy = angleCopy(
      angle({ id: 'worst-venue', tone: 'burn', value: -7, comparisonValue: -3, label: "Sam's place", sampleSize: 11 }),
      ctx
    );
    expect(copy.sentence).toBe(
      "Sam's place eats Muel alive: -$7 a night there, against a -$3 career average."
    );
    expect(copy.kicker).toBe("Across 11 nights at Sam's place.");
  });

  it('pluralises the day label rather than saying "1 Friday nights"', () => {
    const copy = angleCopy(
      angle({ id: 'best-day', tone: 'brag', value: 8, comparisonValue: 1, label: 'Friday', sampleSize: 5 }),
      ctx
    );
    expect(copy.sentence).toBe(
      'Fridays belong to Muel: +$8 a night on them, against a +$1 career average.'
    );
    expect(copy.kicker).toBe('Across 5 Fridays.');
  });

  it('keeps the cents on figures small enough for them to matter', () => {
    const copy = angleCopy(
      angle({ id: 'best-venue', tone: 'brag', value: 7.5, comparisonValue: -2.89, label: 'Garage', sampleSize: 4 }),
      ctx
    );
    expect(copy.sentence).toContain('+$7.50');
    expect(copy.sentence).toContain('-$2.89');
  });

  it('drops the cents once a figure is big enough not to need them', () => {
    const copy = angleCopy(
      angle({ id: 'worst-venue', tone: 'burn', value: -11.43, comparisonValue: 4.14, label: 'Garage', sampleSize: 7 }),
      ctx
    );
    expect(copy.sentence).toContain('-$11');
    expect(copy.sentence).not.toContain('-$11.43');
  });

  it('respects the group currency instead of hardcoding a dollar sign', () => {
    const copy = angleCopy(
      angle({ id: 'rebuy-dollars', tone: 'burn', value: 140, comparisonValue: 23 }),
      { name: 'Lucho', currency: 'EUR' }
    );
    expect(copy.sentence).toBe('Lucho has pushed €140 back onto the table across 23 rebuys.');
    expect(copy.figure).toBe('€140');
  });

  it('singularises a lone rebuy', () => {
    const copy = angleCopy(
      angle({ id: 'rebuy-dollars', tone: 'burn', value: 5, comparisonValue: 1 }),
      { name: 'Divino' }
    );
    expect(copy.sentence).toBe('Divino has pushed $5 back onto the table across 1 rebuy.');
  });

  it('reads a bottom-of-the-career night from the bottom', () => {
    const copy = angleCopy(
      angle({ id: 'night-rank', tone: 'burn', value: 13, comparisonValue: 14, date: '2026-06-16T00:00:00.000Z' }),
      { name: 'Hatus' }
    );
    expect(copy.sentence).toBe(
      "Hatus's most recent night ranks 13th out of 14. Only 1 night has ever been worse."
    );
  });

  it('has a word for the outright worst night', () => {
    const copy = angleCopy(
      angle({ id: 'night-rank', tone: 'burn', value: 14, comparisonValue: 14 }),
      { name: 'Hatus' }
    );
    expect(copy.sentence).toBe("Hatus's most recent night was the worst of all 14.");
  });

  it('celebrates a top-three night', () => {
    const copy = angleCopy(
      angle({ id: 'night-rank', tone: 'brag', value: 3, comparisonValue: 19, date: '2026-06-16T00:00:00.000Z' }),
      ctx
    );
    expect(copy.sentence).toBe("Muel's most recent night was the 3rd best of 19.");
    expect(copy.kicker).toBe('Jun 16, 2026 was a good day.');
  });

  it('says a never-won player has never won, in as many words', () => {
    const copy = angleCopy(angle({ id: 'never-won', tone: 'burn', value: 4 }), { name: 'Divino' });
    expect(copy.sentence).toBe(
      'Divino has played 4 nights and has not won a single one of them.'
    );
  });

  it('treats a single-night newcomer as a newcomer, not a data point', () => {
    const copy = angleCopy(
      angle({ id: 'newcomer', tone: 'neutral', value: 1, fallback: true }),
      { name: 'Divino' }
    );
    expect(copy.sentence).toBe('Divino has one night on the board.');
    expect(copy.kicker).toContain('Too early');
  });
});

describe('pickStory', () => {
  const a = (id: StoryAngleId, fallback = false) => angle({ id, fallback });

  it('has nothing to say about nobody', () => {
    expect(pickStory([])).toEqual({ headline: null, rest: [] });
  });

  it('leads with the best-scoring real finding, keeping the server order behind it', () => {
    const angles = [a('slump'), a('attendance-streak'), a('career-balance', true)];
    const { headline, rest } = pickStory(angles);
    expect(headline?.id).toBe('slump');
    expect(rest.map((r) => r.id)).toEqual(['attendance-streak', 'career-balance']);
  });

  it('skips a fallback that outscored the real findings', () => {
    const angles = [a('career-balance', true), a('nemesis')];
    expect(pickStory(angles).headline?.id).toBe('nemesis');
    expect(pickStory(angles).rest.map((r) => r.id)).toEqual(['career-balance']);
  });

  it('leads a one-night player with "too early to say" rather than a one-night stat', () => {
    const angles = [a('rebuy-dollars'), a('gone-missing'), a('newcomer', true)];
    expect(pickStory(angles).headline?.id).toBe('newcomer');
    expect(pickStory(angles).rest.map((r) => r.id)).toEqual(['rebuy-dollars', 'gone-missing']);
  });

  it('leads a player who has never sat down with exactly that', () => {
    expect(pickStory([a('never-played', true)]).headline?.id).toBe('never-played');
  });

  it('falls back to the first angle when every angle is a fallback', () => {
    expect(pickStory([a('career-balance', true)]).headline?.id).toBe('career-balance');
  });
});

describe('recordShares', () => {
  it('guards the divide-by-zero that rendered "NaN%" for a player with no games', () => {
    expect(recordShares({ wins: 0, losses: 0, draws: 0 })).toEqual({
      total: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    });
  });

  it('splits a record into shares of one', () => {
    const shares = recordShares({ wins: 6, losses: 13, draws: 1 });
    expect(shares.total).toBe(20);
    expect(shares.wins).toBeCloseTo(0.3);
    expect(shares.losses).toBeCloseTo(0.65);
    expect(shares.draws).toBeCloseTo(0.05);
  });
});

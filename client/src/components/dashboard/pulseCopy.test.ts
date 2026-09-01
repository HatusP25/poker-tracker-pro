import { describe, it, expect } from 'vitest';
import {
  angleCopy,
  spreadAngles,
  beltSummary,
  ordinal,
  plural,
  type SpreadItem,
} from './pulseCopy';
import type { BeltLineage, PlayerAngles, StoryAngle, StoryAngleId } from '@/types';

// ---- fixtures ---------------------------------------------------------------

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

const player = (
  playerId: string,
  playerName: string,
  angles: StoryAngle[],
  over: Partial<PlayerAngles> = {}
): PlayerAngles =>
  ({
    playerId,
    playerName,
    isActive: true,
    games: 10,
    balance: 0,
    angles,
    ...over,
  }) as PlayerAngles;

// ---- helpers ----------------------------------------------------------------

describe('ordinal', () => {
  it('handles the teens, which are all "th"', () => {
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
  });

  it('handles the ones digit otherwise', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(17)).toBe('17th');
  });
});

describe('plural', () => {
  it('keeps the singular at exactly one', () => {
    expect(plural(1, 'night')).toBe('night');
    expect(plural(0, 'night')).toBe('nights');
    expect(plural(2, 'night')).toBe('nights');
  });

  it('takes an explicit plural form', () => {
    expect(plural(2, 'is', 'are')).toBe('are');
  });
});

// ---- angleCopy --------------------------------------------------------------

describe('angleCopy', () => {
  const second = { name: 'Muel', voice: 'second' as const, currency: 'USD' };
  const third = { name: 'Muel', voice: 'third' as const, currency: 'USD' };

  it('writes a nemesis in both voices', () => {
    const a = angle('nemesis', {
      family: 'rivalry',
      tone: 'burn',
      value: 13,
      unit: 'count',
      comparisonValue: 19,
      subject: { playerId: 'p1', playerName: 'Lucho' },
      sampleSize: 19,
    });

    const you = angleCopy(a, second);
    expect(you.kicker).toBe('Nemesis');
    expect(you.figure).toBe('13/19');
    expect(you.sign).toBe('loss');
    expect(you.line).toBe(
      'Lucho has finished ahead of you on 13 of your 19 shared nights.'
    );

    expect(angleCopy(a, third).line).toBe(
      'Lucho has finished ahead of Muel on 13 of their 19 shared nights.'
    );
  });

  it('writes a favourite victim', () => {
    const a = angle('favourite-victim', {
      family: 'rivalry',
      tone: 'brag',
      value: 11,
      comparisonValue: 16,
      subject: { playerId: 'p2', playerName: 'Rauw' },
    });
    expect(angleCopy(a, second).line).toBe(
      "You've finished ahead of Rauw on 11 of your 16 shared nights."
    );
    expect(angleCopy(a, third).line).toBe(
      'Muel has finished ahead of Rauw on 11 of their 16 shared nights.'
    );
    expect(angleCopy(a, second).sign).toBe('profit');
  });

  it('calls perfect attendance what it is', () => {
    const perfect = angle('attendance-streak', {
      family: 'attendance',
      tone: 'brag',
      value: 22,
      unit: 'nights',
      comparisonValue: 22,
    });
    expect(angleCopy(perfect, second).kicker).toBe('Perfect record');
    expect(angleCopy(perfect, second).line).toBe(
      "You haven't missed one of the group's 22 nights."
    );

    const partial = angle('attendance-streak', {
      family: 'attendance',
      tone: 'brag',
      value: 7,
      unit: 'nights',
      comparisonValue: 22,
    });
    expect(angleCopy(partial, second).kicker).toBe('On a run');
    expect(angleCopy(partial, second).line).toBe(
      "You've turned up for the last 7 nights running."
    );
    expect(angleCopy(partial, third).line).toBe(
      'Muel has turned up for the last 7 nights running.'
    );
  });

  it('dates a drought when it knows the date', () => {
    const dated = angle('drought', {
      family: 'drought',
      tone: 'burn',
      value: 7,
      unit: 'nights',
      date: '2026-01-25T00:00:00.000Z',
    });
    expect(angleCopy(dated, second).line).toBe(
      "You haven't won a night since Jan 25, 2026 — 7 nights ago."
    );

    const undated = angle('drought', { family: 'drought', tone: 'burn', value: 7, unit: 'nights' });
    expect(angleCopy(undated, third).line).toBe('Muel has gone 7 nights without a win.');
  });

  it('writes the split angles against the player own baseline', () => {
    const day = angle('best-day', {
      family: 'split',
      tone: 'brag',
      value: 12,
      unit: 'currency',
      comparisonValue: 4,
      label: 'Friday',
      sampleSize: 8,
    });
    expect(angleCopy(day, second).kicker).toBe('Best day');
    expect(angleCopy(day, second).figure).toBe('+$12');
    expect(angleCopy(day, second).line).toBe(
      'Fridays: +$12 a night, against your usual +$4.'
    );

    const venue = angle('worst-venue', {
      family: 'split',
      tone: 'burn',
      value: -11.43,
      unit: 'currency',
      comparisonValue: 4.14,
      label: 'Unspecified',
    });
    expect(angleCopy(venue, third).figure).toBe('-$11.43');
    expect(angleCopy(venue, third).line).toBe(
      "Nights with no venue recorded: -$11.43 a night, against Muel's usual +$4.14."
    );

    const table = angle('best-table-size', {
      family: 'split',
      tone: 'brag',
      value: 9,
      unit: 'currency',
      comparisonValue: 2,
      label: '6-handed',
    });
    expect(angleCopy(table, second).line).toBe(
      '6-handed tables: +$9 a night, against your usual +$2.'
    );
  });

  it('counts rebuy dollars, not rebuy rate', () => {
    const a = angle('rebuy-dollars', {
      family: 'rebuys',
      tone: 'burn',
      value: 140,
      unit: 'currency',
      comparisonValue: 23,
    });
    expect(angleCopy(a, second).figure).toBe('$140');
    expect(angleCopy(a, second).sign).toBe('loss');
    expect(angleCopy(a, second).line).toBe(
      "You've put $140 back on the table across 23 rebuys."
    );
  });

  it('ranks last night from the top when good and names the position when bad', () => {
    const good = angle('night-rank', {
      family: 'nights',
      tone: 'brag',
      value: 3,
      unit: 'rank',
      comparisonValue: 19,
    });
    expect(angleCopy(good, second).figure).toBe('3rd');
    expect(angleCopy(good, second).line).toBe('Last night was your 3rd-best of 19.');

    const bad = angle('night-rank', {
      family: 'nights',
      tone: 'burn',
      value: 17,
      unit: 'rank',
      comparisonValue: 19,
    });
    expect(angleCopy(bad, third).line).toBe("Last night ranked 17th of Muel's 19.");
  });

  it('writes a career balance three ways', () => {
    const up = angle('career-balance', {
      tone: 'brag',
      value: 91,
      unit: 'currency',
      comparisonValue: 22,
      fallback: true,
    });
    expect(angleCopy(up, second).line).toBe("You're +$91 across 22 nights.");
    expect(angleCopy(up, second).sign).toBe('profit');

    const down = angle('career-balance', {
      tone: 'burn',
      value: -55,
      unit: 'currency',
      comparisonValue: 19,
      fallback: true,
    });
    expect(angleCopy(down, third).line).toBe('Muel is -$55 across 19 nights.');

    const even = angle('career-balance', {
      tone: 'neutral',
      value: 0,
      unit: 'currency',
      comparisonValue: 14,
      fallback: true,
    });
    expect(angleCopy(even, second).figure).toBe('$0');
    expect(angleCopy(even, second).sign).toBe('neutral');
    expect(angleCopy(even, second).line).toBe('You are dead even across 14 nights.');
  });

  it('never returns an empty sentence for any angle id', () => {
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
      const copy = angleCopy(
        angle(id, {
          value: 4,
          comparisonValue: 9,
          label: 'Friday',
          subject: { playerId: 'x', playerName: 'Lucho' },
          date: '2026-02-23T00:00:00.000Z',
        }),
        second
      );
      expect(copy.line.length, id).toBeGreaterThan(0);
      expect(copy.kicker.length, id).toBeGreaterThan(0);
      expect(copy.figure.length, id).toBeGreaterThan(0);
      expect(copy.line.endsWith('.'), id).toBe(true);
    }
  });
});

// ---- spreadAngles -----------------------------------------------------------

describe('spreadAngles', () => {
  const roster = [
    player('a', 'Lucho', [
      angle('slump', { family: 'form', score: 84, value: 7 }),
      angle('drought', { family: 'drought', score: 74, value: 7 }),
    ]),
    player('b', 'Rauw', [
      angle('slump', { family: 'form', score: 76, value: 5 }),
      angle('nemesis', {
        family: 'rivalry',
        score: 49,
        value: 11,
        comparisonValue: 16,
        subject: { playerId: 'a', playerName: 'Lucho' },
      }),
    ]),
    player('c', 'Muel', [angle('rebuy-dollars', { family: 'rebuys', score: 58, value: 75 })]),
    player('d', 'Hatus', [angle('attendance-streak', { family: 'attendance', score: 72, value: 7 })]),
  ];

  const names = (items: SpreadItem[]) => items.map((i) => i.player.playerName);
  const ids = (items: SpreadItem[]) => items.map((i) => i.angle.id);

  it('gives at most one angle per player, best score first', () => {
    const out = spreadAngles(roster, { count: 4 });
    expect(names(out)).toEqual(['Lucho', 'Rauw', 'Hatus', 'Muel']);
    expect(new Set(names(out)).size).toBe(4);
  });

  it('avoids telling the same kind of story twice', () => {
    // Lucho and Rauw both lead with a 'form' slump; Rauw falls back to his rivalry.
    const out = spreadAngles(roster, { count: 4 });
    expect(ids(out)).toEqual(['slump', 'nemesis', 'attendance-streak', 'rebuy-dollars']);
  });

  it('leaves out the player who is already looking at their own card', () => {
    const out = spreadAngles(roster, { count: 4, excludePlayerId: 'a' });
    expect(names(out)).not.toContain('Lucho');
    expect(out).toHaveLength(3);
  });

  it('rotates which angle each player leads with, so the page changes', () => {
    const seed0 = spreadAngles(roster, { count: 4, seed: 0 });
    const seed1 = spreadAngles(roster, { count: 4, seed: 1 });
    expect(ids(seed0)).not.toEqual(ids(seed1));
    // A player with a single angle keeps it whatever the seed.
    expect(ids(seed1)).toContain('rebuy-dollars');
  });

  it('drops players who have never played and empty rosters', () => {
    const withGhost = [
      ...roster,
      player('e', 'Ghost', [angle('never-played', { fallback: true })], { games: 0 }),
    ];
    expect(names(spreadAngles(withGhost, { count: 8 }))).not.toContain('Ghost');
    expect(spreadAngles([], { count: 3 })).toEqual([]);
    expect(spreadAngles(undefined, { count: 3 })).toEqual([]);
  });

  it('honours the count', () => {
    expect(spreadAngles(roster, { count: 2 })).toHaveLength(2);
  });
});

// ---- beltSummary ------------------------------------------------------------

describe('beltSummary', () => {
  const lineage: BeltLineage = {
    current: {
      playerId: 'm',
      playerName: 'Muel',
      fromDate: '2026-06-16T00:00:00.000Z',
      toDate: null,
      nightsHeld: 1,
      defenses: 0,
      takenFromPlayerName: 'Hatus',
    },
    history: [
      {
        playerId: 'l',
        playerName: 'Lucho',
        fromDate: '2025-10-26T00:00:00.000Z',
        toDate: '2025-11-09T00:00:00.000Z',
        nightsHeld: 3,
        defenses: 1,
        takenFromPlayerName: null,
      },
      {
        playerId: 'm',
        playerName: 'Muel',
        fromDate: '2025-11-09T00:00:00.000Z',
        toDate: '2025-11-16T00:00:00.000Z',
        nightsHeld: 2,
        defenses: 0,
        takenFromPlayerName: 'Lucho',
      },
    ],
    totalTitleChanges: 3,
  };

  it('reports the current holder and how they got it', () => {
    const s = beltSummary(lineage)!;
    expect(s.holderId).toBe('m');
    expect(s.holderName).toBe('Muel');
    expect(s.nightsHeld).toBe(1);
    expect(s.takenFrom).toBe('Hatus');
    expect(s.totalTitleChanges).toBe(3);
  });

  it('finds the longest reign on record for context', () => {
    const s = beltSummary(lineage)!;
    expect(s.longestReign).toEqual({ playerName: 'Lucho', nightsHeld: 3 });
  });

  it('knows whether the belt changed hands on a given night', () => {
    const s = beltSummary(lineage)!;
    expect(s.changedHandsOn('2026-06-16T00:00:00.000Z')).toBe(true);
    expect(s.changedHandsOn('2026-06-16')).toBe(true);
    expect(s.changedHandsOn('2026-04-15T00:00:00.000Z')).toBe(false);
    expect(s.changedHandsOn(null)).toBe(false);
  });

  it('returns null when nobody holds it', () => {
    expect(beltSummary(null)).toBeNull();
    expect(beltSummary(undefined)).toBeNull();
    expect(beltSummary({ current: null, history: [], totalTitleChanges: 0 })).toBeNull();
  });
});

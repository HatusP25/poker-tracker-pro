import { describe, it, expect } from 'vitest';
import {
  buildNightCardScene,
  buildBeltCardScene,
  buildSeasonCardScene,
  type Scene,
  type NightCardInput,
} from './shareCard';

const texts = (scene: Scene) =>
  scene.items.filter((i) => i.kind === 'text').map((i) => (i as any).text as string);

const textItem = (scene: Scene, needle: string) =>
  scene.items.find((i) => i.kind === 'text' && (i as any).text.includes(needle)) as any;

/** Nothing may be laid out beyond the card it is drawn on. */
const withinBounds = (scene: Scene) =>
  scene.items.every((i) => {
    const y = (i as any).y as number;
    const x = (i as any).x as number;
    return y >= 0 && y <= scene.height && x >= 0 && x <= scene.width;
  });

const night = (over: Partial<NightCardInput> = {}): NightCardInput => ({
  date: '2026-05-01',
  currency: '$',
  results: [
    { name: 'Ana', profit: 45, titles: [] },
    { name: 'Dave', profit: -45, titles: [] },
  ],
  settlements: [{ from: 'Dave', to: 'Ana', amount: 45 }],
  ...over,
});

describe('buildNightCardScene', () => {
  it('names every player and their result', () => {
    const t = texts(buildNightCardScene(night())).join(' | ');

    expect(t).toContain('Ana');
    expect(t).toContain('+$45');
    expect(t).toContain('Dave');
    expect(t).toContain('-$45');
  });

  it('orders players by profit, biggest winner first — matching the text message', () => {
    const scene = buildNightCardScene(
      night({
        results: [
          { name: 'Loser', profit: -30, titles: [] },
          { name: 'Winner', profit: 30, titles: [] },
        ],
        settlements: [],
      })
    );

    const winnerY = textItem(scene, 'Winner').y;
    const loserY = textItem(scene, 'Loser').y;
    expect(winnerY).toBeLessThan(loserY);
  });

  it('colours a win green and a loss red', () => {
    const scene = buildNightCardScene(night());

    expect(textItem(scene, '+$45').color).toBe('#10B981');
    expect(textItem(scene, '-$45').color).toBe('#EF4444');
  });

  it('carries night-title emoji alongside the name', () => {
    const scene = buildNightCardScene(
      night({
        results: [
          {
            name: 'Ana',
            profit: 45,
            titles: [{ id: 'shark', label: 'Shark of the Night', emoji: '🦈' }] as any,
          },
          { name: 'Dave', profit: -45, titles: [] },
        ],
      })
    );

    expect(texts(scene).join(' ')).toContain('🦈');
  });

  it('includes the settle-up transfers', () => {
    const t = texts(buildNightCardScene(night())).join(' | ');

    expect(t).toContain('SETTLE UP');
    expect(t).toContain('Dave  →  Ana');
  });

  it('omits the settle-up section when the night squared itself', () => {
    const t = texts(buildNightCardScene(night({ settlements: [] }))).join(' | ');
    expect(t).not.toContain('SETTLE UP');
  });

  it('includes the belt line when there is one', () => {
    const t = texts(
      buildNightCardScene(night({ belt: { line: 'Ana takes the belt from Dave' } }))
    ).join(' | ');

    expect(t).toContain('🥇 Ana takes the belt from Dave');
  });

  it('omits the belt line when there is none', () => {
    expect(texts(buildNightCardScene(night())).join(' | ')).not.toContain('🥇');
  });

  it('grows taller as more players are added', () => {
    const two = buildNightCardScene(night({ settlements: [] }));
    const six = buildNightCardScene(
      night({
        settlements: [],
        results: Array.from({ length: 6 }, (_, i) => ({
          name: `P${i}`,
          profit: i - 3,
          titles: [],
        })),
      })
    );

    expect(six.height).toBeGreaterThan(two.height);
  });

  it('keeps every element inside the card', () => {
    const scene = buildNightCardScene(
      night({
        results: Array.from({ length: 10 }, (_, i) => ({
          name: `Player ${i}`,
          profit: i * 5 - 25,
          titles: [],
        })),
        belt: { line: 'Ana holds' },
      })
    );

    expect(withinBounds(scene)).toBe(true);
  });

  it('right-aligns amounts against the far edge', () => {
    const scene = buildNightCardScene(night());
    const amount = textItem(scene, '+$45');

    expect(amount.align).toBe('right');
    expect(amount.x).toBe(scene.width - 72);
  });

  it('uses the group currency symbol', () => {
    const t = texts(buildNightCardScene(night({ currency: '€' }))).join(' | ');
    expect(t).toContain('+€45');
  });

  it('always signs the footer', () => {
    expect(texts(buildNightCardScene(night()))).toContain('Poker Tracker Pro');
  });
});

describe('buildBeltCardScene', () => {
  it('leads with the new holder', () => {
    const scene = buildBeltCardScene({
      holderName: 'Ana',
      takenFromName: 'Dave',
      nightsHeld: 3,
      defenses: 2,
    });

    expect(textItem(scene, 'Ana').size).toBeGreaterThan(60);
    expect(texts(scene).join(' | ')).toContain('Taken from Dave');
  });

  it('reads as a reign when nobody was dethroned', () => {
    const t = texts(
      buildBeltCardScene({ holderName: 'Ana', takenFromName: null, nightsHeld: 1, defenses: 0 })
    ).join(' | ');

    expect(t).toContain('Reigning champion');
    expect(t).not.toContain('Taken from');
  });

  it('reports nights held and defenses, pluralised', () => {
    const many = texts(
      buildBeltCardScene({ holderName: 'Ana', takenFromName: 'Dave', nightsHeld: 6, defenses: 4 })
    ).join(' | ');
    expect(many).toContain('6 nights held \u00b7 4 defenses');

    const one = texts(
      buildBeltCardScene({ holderName: 'Ana', takenFromName: null, nightsHeld: 1, defenses: 1 })
    ).join(' | ');
    expect(one).toContain('1 night held \u00b7 1 defense');
  });

  it('centres the hero block rather than mixing alignments', () => {
    const scene = buildBeltCardScene({
      holderName: 'Ana',
      takenFromName: 'Dave',
      nightsHeld: 6,
      defenses: 4,
    });

    expect(textItem(scene, 'Ana').align).toBe('center');
    expect(textItem(scene, 'nights held').align).toBe('center');
  });

  it('keeps every element inside the card', () => {
    expect(
      withinBounds(
        buildBeltCardScene({ holderName: 'Ana', takenFromName: 'Dave', nightsHeld: 3, defenses: 2 })
      )
    ).toBe(true);
  });
});

describe('buildSeasonCardScene', () => {
  const season = {
    period: '2026',
    currency: '$',
    totalSessions: 23,
    totalPot: 730,
    champion: { playerName: 'Lucho', value: 86 },
    attendanceKing: { playerName: 'Hatus', value: 21 },
    biggestMover: { playerName: 'Muel', positionsGained: 3 },
    bestSingleNight: { playerName: 'Lucho', value: 45 },
    mostRebuys: { playerName: 'Hatus', value: 6 },
  };

  it('headlines the period and the scale of the year', () => {
    const t = texts(buildSeasonCardScene(season)).join(' | ');

    expect(t).toContain('2026 Wrapped');
    expect(t).toContain('23 nights');
    expect(t).toContain('$730');
  });

  it('lists every superlative that has a winner', () => {
    const t = texts(buildSeasonCardScene(season)).join(' | ');

    expect(t).toContain('Champion');
    expect(t).toContain('Lucho');
    expect(t).toContain('Best night');
    expect(t).toContain('Most nights');
    expect(t).toContain('Biggest mover');
    expect(t).toContain('Most rebuys');
  });

  it('skips superlatives with no winner rather than printing blanks', () => {
    const t = texts(
      buildSeasonCardScene({
        ...season,
        biggestMover: null,
        mostRebuys: null,
      })
    ).join(' | ');

    expect(t).not.toContain('Biggest mover');
    expect(t).not.toContain('Most rebuys');
    expect(t).toContain('Champion');
  });

  it('is shorter when there is less to say', () => {
    const full = buildSeasonCardScene(season);
    const sparse = buildSeasonCardScene({
      ...season,
      attendanceKing: null,
      biggestMover: null,
      bestSingleNight: null,
      mostRebuys: null,
    });

    expect(sparse.height).toBeLessThan(full.height);
  });

  it('keeps every element inside the card', () => {
    expect(withinBounds(buildSeasonCardScene(season))).toBe(true);
  });
});

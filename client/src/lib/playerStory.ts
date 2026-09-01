import type { StoryAngle, StoryAngleId } from '@/types';
import { formatMoney } from '@/lib/viz/money';
import { moneySign, type MoneySign } from '@/lib/viz/sign';
import { hasNickname, type NameableePlayer } from '@/lib/displayName';
import { parseLocalDate } from '@/lib/dateUtils';

/**
 * The words.
 *
 * The server derives *facts* about a player — a nemesis, a drought, the venue
 * that eats them alive — scores them, and returns the best few as structured
 * values with no prose anywhere (DECISIONS D-007). This module is the other
 * half of that contract: it turns each fact into the sentence a person would
 * actually repeat.
 *
 * That sentence is the product. "Attendance Streak: 7" is a dashboard; "Lucho
 * has been at every single one of the group's 22 nights" is something you
 * screenshot into the group chat. Every angle here gets written like a friend
 * talking, and the `burn` ones get written like a friend enjoying themselves —
 * a home game wants both, and the losses are funnier than the wins.
 *
 * Three rules the copy holds to:
 *
 *   1. **No pronouns.** The app does not know anyone's gender, so every
 *      sentence names the player instead. It reads punchier anyway.
 *   2. **Third person, first name (or nickname).** A card is read as often by
 *      the rest of the group as by its subject, and "Muel hasn't beaten Lucho
 *      in 13 tries" is the quotable form. Second person would be wrong on
 *      someone else's card.
 *   3. **Nothing the data does not support.** No "the longest cold run in the
 *      group" unless the group was actually checked. The burn has to be true.
 */

// ---- Names -------------------------------------------------------------------

/**
 * How a player is named inside a sentence.
 *
 * `displayName()` gives `Ana "The Closer"`, which is right for a heading and
 * wrong mid-clause. Here the nickname *replaces* the name when there is one —
 * it is what the group calls them — and otherwise the first name carries it.
 */
export function storyName(player: NameableePlayer): string {
  if (hasNickname(player)) return player.nickname!.trim();
  const first = (player.name ?? '').trim().split(/\s+/).filter(Boolean)[0];
  return first || 'This player';
}

/** `Muel's`. Names ending in s take a plain apostrophe-s; that is the modern style. */
const possessive = (name: string): string => `${name}'s`;

// ---- Small formatters --------------------------------------------------------

export function ordinal(value: number): string {
  const n = Math.abs(Math.round(Number.isFinite(value) ? value : 0));
  const tens = n % 100;
  const suffix =
    tens >= 11 && tens <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

const count = (n: number, one: string, many = `${one}s`): string =>
  `${n} ${Math.abs(n) === 1 ? one : many}`;

const nights = (n: number): string => count(n, 'night');

/**
 * Cents only where they carry meaning. A $7.50-a-night average in a $5 game is
 * a different claim from a $7 one; a -$11.43 one is just -$11 with noise on it.
 */
const decimalsFor = (value: number): number =>
  Math.abs(value) < 10 && !Number.isInteger(value) ? 2 : 0;

const money = (value: number, currency?: string | null): string =>
  formatMoney(value, { currency, signed: true, decimals: decimalsFor(value) });

const amount = (value: number, currency?: string | null): string =>
  formatMoney(value, { currency, decimals: decimalsFor(value) });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `Jan 4, 2026`. Always carries the year — a home game spans seasons and "Jan 4"
 * on its own has meant two different nights in this group already. Unpadded,
 * because "Jan 04" is a filename, not a sentence.
 */
export function storyDate(iso: string): string {
  const date = parseLocalDate(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * The venue split buckets nights with no `location` under the literal label
 * "Unspecified" (server `venueBucket`). Printing that at a reader is a leaked
 * implementation detail, so those nights get described instead of named.
 */
const isUnnamedVenue = (label: string | null): boolean =>
  !label || label.trim().toLowerCase() === 'unspecified';

// ---- The shape of a written angle -------------------------------------------

export interface StoryCopyContext {
  /** Already run through `storyName`. */
  name: string;
  /** ISO code from `group.currency`. */
  currency?: string | null;
}

export interface AngleCopy {
  id: StoryAngleId;
  /** Two or three words, set as an eyebrow above the figure. */
  eyebrow: string;
  /** The glance value, already formatted. */
  figure: string;
  /** How to colour the figure. `undefined` leaves it in plain foreground. */
  figureSign: MoneySign | undefined;
  /** The line. This is the thing the page exists to say. */
  sentence: string;
  /** The follow-up: the evidence, or the joke. */
  kicker: string | null;
  /** A night worth linking to, where the angle points at one. */
  sessionId: string | null;
  /** True when this is the floor rather than a finding — present it softly. */
  fallback: boolean;
}

/** Every id `anglesRules.ts` can emit, so a test can prove none is unwritten. */
export const ALL_STORY_ANGLE_IDS: readonly StoryAngleId[] = [
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

interface Written {
  eyebrow: string;
  figure: string;
  figureSign?: MoneySign;
  sentence: string;
  kicker?: string | null;
}

type Writer = (a: StoryAngle, c: StoryCopyContext) => Written;

// ---- The catalogue -----------------------------------------------------------

const WRITERS: Partial<Record<StoryAngleId, Writer>> = {
  // --- Rivalry -----------------------------------------------------------
  nemesis: (a, c) => {
    const rival = a.subject?.playerName ?? 'Somebody';
    const shared = a.comparisonValue ?? a.sampleSize;
    return {
      eyebrow: 'Nemesis',
      figure: `${a.value}/${shared}`,
      figureSign: 'loss',
      sentence: `${rival} has finished ahead of ${c.name} on ${a.value} of their ${shared} nights together.`,
      kicker: 'That is a nemesis, not a coincidence.',
    };
  },

  'favourite-victim': (a, c) => {
    const victim = a.subject?.playerName ?? 'Somebody';
    const shared = a.comparisonValue ?? a.sampleSize;
    return {
      eyebrow: 'Favourite victim',
      figure: `${a.value}/${shared}`,
      figureSign: 'profit',
      sentence: `${c.name} has finished ahead of ${victim} on ${a.value} of their ${shared} nights together.`,
      kicker: `${victim} keeps sitting down anyway.`,
    };
  },

  // --- Attendance --------------------------------------------------------
  'attendance-streak': (a, c) => {
    const eligible = a.comparisonValue ?? 0;
    const perfect = eligible > 0 && a.value >= eligible;
    return {
      eyebrow: 'Never misses',
      figure: nights(a.value),
      figureSign: 'profit',
      sentence: perfect
        ? `${c.name} has been at every single one of the group's ${eligible} nights.`
        : `${c.name} has turned up ${a.value} nights in a row.`,
      kicker: perfect ? 'Perfect attendance. Not one night off.' : 'Still counting.',
    };
  },

  'attendance-rate': (a, c) => ({
    eyebrow: 'Reliable',
    figure: `${Math.round(a.value)}%`,
    figureSign: 'profit',
    sentence: `${c.name} has made ${Math.round(a.value)}% of the nights on offer since first sitting down.`,
    kicker: `${count(a.comparisonValue ?? a.sampleSize, 'group night')} to choose from.`,
  }),

  'gone-missing': (a, c) => ({
    eyebrow: 'Gone missing',
    figure: nights(a.value),
    figureSign: 'loss',
    sentence: a.date
      ? `${c.name} has missed the last ${nights(a.value)}. Last seen at the table on ${storyDate(a.date)}.`
      : `${c.name} has missed the last ${nights(a.value)}.`,
    kicker: 'The seat is still there.',
  }),

  // --- Drought -----------------------------------------------------------
  drought: (a, c) => ({
    eyebrow: 'Drought',
    figure: nights(a.value),
    figureSign: 'loss',
    sentence: a.date
      ? `${c.name} has not finished a night up since ${storyDate(a.date)} — that is ${nights(a.value)} ago.`
      : `${c.name} has gone ${nights(a.value)} without finishing one up.`,
    kicker: 'Somebody is due.',
  }),

  'never-won': (a, c) => ({
    eyebrow: 'Still waiting',
    figure: nights(a.value),
    figureSign: 'loss',
    sentence: `${c.name} has played ${nights(a.value)} and has not won a single one of them.`,
    kicker: "Everyone's first has to come from somewhere.",
  }),

  // --- Splits ------------------------------------------------------------
  'best-day': (a, c) => ({
    eyebrow: 'Best day',
    figure: money(a.value, c.currency),
    figureSign: 'profit',
    sentence: `${a.label}s belong to ${c.name}: ${money(a.value, c.currency)} a night on them, against a ${money(a.comparisonValue ?? 0, c.currency)} career average.`,
    kicker: `Across ${a.sampleSize} ${a.label}s.`,
  }),

  'worst-day': (a, c) => ({
    eyebrow: 'Worst day',
    figure: money(a.value, c.currency),
    figureSign: 'loss',
    sentence: `Something about ${a.label}s: ${c.name} averages ${money(a.value, c.currency)} on them, against a ${money(a.comparisonValue ?? 0, c.currency)} career average.`,
    kicker: `Across ${a.sampleSize} ${a.label}s.`,
  }),

  'best-venue': (a, c) => {
    const unnamed = isUnnamedVenue(a.label);
    const avg = money(a.value, c.currency);
    const career = money(a.comparisonValue ?? 0, c.currency);
    return {
      eyebrow: 'Best room',
      figure: avg,
      figureSign: 'profit',
      sentence: unnamed
        ? `${c.name} does best on the nights nobody wrote down a venue: ${avg} a night, against a ${career} career average.`
        : `${c.name} should move into ${a.label} — ${avg} a night there, against a ${career} career average.`,
      kicker: unnamed
        ? `Across ${a.sampleSize} nights with no venue recorded.`
        : `Across ${a.sampleSize} nights at ${a.label}.`,
    };
  },

  'worst-venue': (a, c) => {
    const unnamed = isUnnamedVenue(a.label);
    const avg = money(a.value, c.currency);
    const career = money(a.comparisonValue ?? 0, c.currency);
    return {
      eyebrow: 'Worst room',
      figure: avg,
      figureSign: 'loss',
      sentence: unnamed
        ? `The nights nobody bothered to record a venue are ${possessive(c.name)} worst: ${avg} a night, against a ${career} career average.`
        : `${a.label} eats ${c.name} alive: ${avg} a night there, against a ${career} career average.`,
      kicker: unnamed
        ? `Across ${a.sampleSize} nights with no venue recorded.`
        : `Across ${a.sampleSize} nights at ${a.label}.`,
    };
  },

  'best-table-size': (a, c) => ({
    eyebrow: 'Best table',
    figure: money(a.value, c.currency),
    figureSign: 'profit',
    sentence: `${c.name} plays best ${a.label} — ${money(a.value, c.currency)} a night, against a ${money(a.comparisonValue ?? 0, c.currency)} career average.`,
    kicker: `Across ${a.sampleSize} nights at a ${a.label} table.`,
  }),

  'worst-table-size': (a, c) => ({
    eyebrow: 'Worst table',
    figure: money(a.value, c.currency),
    figureSign: 'loss',
    sentence: `${c.name} struggles ${a.label} — ${money(a.value, c.currency)} a night, against a ${money(a.comparisonValue ?? 0, c.currency)} career average.`,
    kicker: `Across ${a.sampleSize} nights at a ${a.label} table.`,
  }),

  // --- Rebuys ------------------------------------------------------------
  'rebuy-dollars': (a, c) => {
    const rebuys = a.comparisonValue ?? 0;
    return {
      eyebrow: 'Back on the table',
      figure: amount(a.value, c.currency),
      figureSign: 'loss',
      sentence: `${c.name} has pushed ${amount(a.value, c.currency)} back onto the table across ${count(rebuys, 'rebuy')}.`,
      kicker:
        rebuys === 1
          ? 'One decision to keep going.'
          : `${rebuys} separate decisions to keep going.`,
    };
  },

  // --- Departures --------------------------------------------------------
  'early-exit': (a, c) => ({
    eyebrow: 'Leaves early',
    figure: money(a.value, c.currency),
    figureSign: 'loss',
    sentence: `When ${c.name} leaves early the night averages ${money(a.value, c.currency)}. When ${c.name} stays, it averages ${money(a.comparisonValue ?? 0, c.currency)}.`,
    kicker: `Across ${a.sampleSize} nights where anyone's exit time was written down.`,
  }),

  // --- Nights ------------------------------------------------------------
  'career-night': (a, c) => ({
    eyebrow: 'Career night',
    figure: money(a.value, c.currency),
    figureSign: 'profit',
    sentence: a.date
      ? `${possessive(c.name)} best night ever came on ${storyDate(a.date)}: ${money(a.value, c.currency)}.`
      : `${possessive(c.name)} best night ever was ${money(a.value, c.currency)}.`,
    kicker: `Still the one to beat, ${nights(a.comparisonValue ?? a.sampleSize)} in.`,
  }),

  'night-rank': (a, c) => {
    const outOf = a.comparisonValue ?? a.sampleSize;
    const fromBottom = outOf - a.value + 1;
    const brag = a.tone === 'brag';
    const sentence = brag
      ? `${possessive(c.name)} most recent night was the ${ordinal(a.value)} best of ${outOf}.`
      : fromBottom <= 1
        ? `${possessive(c.name)} most recent night was the worst of all ${outOf}.`
        : `${possessive(c.name)} most recent night ranks ${ordinal(a.value)} out of ${outOf}. Only ${count(fromBottom - 1, 'night')} ${fromBottom - 1 === 1 ? 'has' : 'have'} ever been worse.`;
    return {
      eyebrow: 'Last time out',
      figure: ordinal(a.value),
      figureSign: brag ? 'profit' : 'loss',
      sentence,
      kicker: a.date
        ? brag
          ? `${storyDate(a.date)} was a good day.`
          : `That was ${storyDate(a.date)}.`
        : null,
    };
  },

  // --- Form --------------------------------------------------------------
  heater: (a, c) => ({
    eyebrow: 'On a heater',
    figure: nights(a.value),
    figureSign: 'profit',
    sentence: `${c.name} has finished up ${nights(a.value)} in a row.`,
    kicker: 'Running hot, and everyone at the table knows it.',
  }),

  slump: (a, c) => ({
    eyebrow: 'In a slump',
    figure: nights(a.value),
    figureSign: 'loss',
    sentence: `${c.name} has finished down ${nights(a.value)} running.`,
    kicker: 'It has to break eventually.',
  }),

  // --- Social ------------------------------------------------------------
  'played-together': (a, c) => {
    const other = a.subject?.playerName ?? 'the group';
    return {
      eyebrow: 'Regular table',
      figure: nights(a.value),
      sentence: `${c.name} and ${other} have shared a table ${a.value} times — more than ${c.name} has with anyone else.`,
      kicker: 'The rivalry writes itself.',
    };
  },

  // --- Career (the guaranteed floor) -------------------------------------
  'career-balance': (a, c) => {
    const sign = moneySign(a.value);
    const games = a.comparisonValue ?? a.sampleSize;
    return {
      eyebrow: 'The career',
      figure: sign === 'neutral' ? 'Even' : money(a.value, c.currency),
      figureSign: sign,
      sentence:
        sign === 'neutral'
          ? `${c.name} is dead even across ${nights(games)} of poker.`
          : `${c.name} is ${money(a.value, c.currency)} across ${nights(games)} of poker.`,
      kicker:
        sign === 'profit'
          ? 'Somebody has been paying for that.'
          : sign === 'loss'
            ? 'Call it the cost of the seat.'
            : 'Not a dollar up, not a dollar down.',
    };
  },

  newcomer: (a, c) => ({
    eyebrow: 'New face',
    figure: nights(a.value),
    sentence:
      a.value === 1
        ? `${c.name} has one night on the board.`
        : `${c.name} has ${nights(a.value)} on the board.`,
    kicker: 'Too early to say anything, which is its own kind of dangerous.',
  }),

  'never-played': (_a, c) => ({
    eyebrow: 'Yet to sit down',
    figure: 'No nights',
    sentence: `${c.name} is on the roster but has not played a night yet.`,
    kicker: 'The card fills in from the first hand.',
  }),
};

/**
 * The last resort: an id the server grew that this client has not learned yet.
 * Says something true and generic rather than rendering an empty card.
 */
const unknownAngle = (a: StoryAngle, c: StoryCopyContext): Written => ({
  eyebrow: 'On the record',
  figure: a.unit === 'currency' ? money(a.value, c.currency) : String(a.value),
  figureSign: a.unit === 'currency' ? moneySign(a.value) : undefined,
  sentence: `${c.name} has something going on that this app has not learned to describe yet.`,
  kicker: null,
});

/** One structured fact in, one written card out. */
export function angleCopy(angle: StoryAngle, ctx: StoryCopyContext): AngleCopy {
  const writer = WRITERS[angle.id];
  const written = writer ? writer(angle, ctx) : unknownAngle(angle, ctx);
  return {
    id: angle.id,
    eyebrow: written.eyebrow,
    figure: written.figure,
    figureSign: written.figureSign,
    sentence: written.sentence,
    kicker: written.kicker ?? null,
    sessionId: angle.sessionId,
    fallback: angle.fallback || !writer,
  };
}

// ---- Which angle leads -------------------------------------------------------

/**
 * True of virtually everyone, and therefore not an opening line.
 *
 * The server scores an angle on specificity, evidence and recency, and by those
 * measures a big rebuy total is a strong finding. But in a five-dollar home
 * game *everybody* rebuys and everybody has somebody they have sat next to
 * most, so these two land at the top of nearly every card and say nothing that
 * separates one player from the next. They stay in the story; they just do not
 * lead it while something specific to this person is available.
 */
const COMMON_ANGLE_IDS: ReadonlySet<StoryAngleId> = new Set(['rebuy-dollars', 'played-together']);

/**
 * The angles arrive best-first, so the headline is usually just the first one.
 * Three client-side edits on top of that ranking, all of them editorial — which
 * is exactly the half of the contract this side owns:
 *
 *   - A `fallback` angle is the floor, not a finding. If anything real is in
 *     the list, that leads instead.
 *   - A finding everyone shares does not lead while a specific one exists.
 *   - Except for a player one or two nights old: "too early to say" is a more
 *     honest opening line than any single-night statistic, so the newcomer
 *     angle — and the never-played one — outrank everything.
 */
export function pickStory(angles: StoryAngle[]): {
  headline: StoryAngle | null;
  rest: StoryAngle[];
} {
  if (!angles || angles.length === 0) return { headline: null, rest: [] };

  const real = (a: StoryAngle) => !a.fallback;
  const headline =
    angles.find((a) => a.id === 'never-played') ??
    angles.find((a) => a.id === 'newcomer') ??
    angles.find((a) => real(a) && !COMMON_ANGLE_IDS.has(a.id)) ??
    angles.find(real) ??
    angles[0];

  return { headline, rest: angles.filter((a) => a !== headline) };
}

// ---- The record --------------------------------------------------------------

export interface RecordCounts {
  wins: number;
  losses: number;
  draws: number;
}

export interface RecordShares extends RecordCounts {
  total: number;
}

/**
 * A win/loss/draw record as shares of one.
 *
 * The old Session Breakdown divided by `totalGames` with no zero guard, so a
 * player with no completed nights got three bars reading "NaN%". A record of
 * nothing is a record of nothing, and every share is zero.
 */
export function recordShares(counts: RecordCounts): RecordShares {
  const wins = Math.max(0, counts.wins || 0);
  const losses = Math.max(0, counts.losses || 0);
  const draws = Math.max(0, counts.draws || 0);
  const total = wins + losses + draws;
  if (total <= 0) return { total: 0, wins: 0, losses: 0, draws: 0 };
  return { total, wins: wins / total, losses: losses / total, draws: draws / total };
}

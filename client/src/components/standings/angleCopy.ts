import { formatMoney, formatPercent } from '@/lib/viz';
import { parseLocalDate } from '@/lib/dateUtils';
import type { PlayerAngles, StoryAngle, StoryAngleId } from '@/types';

/**
 * The words.
 *
 * D-007 draws the line: the server derives and *scores* each angle and returns
 * structured facts — a value, a comparison, a subject, a sample size — and
 * never a sentence. Tone and phrasing are a client concern, so they can change
 * without a deploy of anything but this file.
 *
 * House style for a standings chip, which sits inside a row that already names
 * the player and shows their balance:
 *   - third person, no name, no "you";
 *   - broadcast-terse, one clause, no full stop;
 *   - counts from two to ten are spelled out, so prose reads as prose next to
 *     a column of numerals; money and percentages stay figures;
 *   - money always through `formatMoney` with the group's currency, never a
 *     hardcoded "$" (design §5.8).
 */

export interface AngleCopyOptions {
  /** ISO code from `group.currency`. */
  currency?: string | null;
}

// ---- Small helpers ----------------------------------------------------------

const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

/** Spelled out to ten, numerals past it. */
const spell = (value: number): string => {
  const n = Math.round(Math.abs(value));
  return n <= 10 ? WORDS[n] : n.toLocaleString('en-US');
};

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const plural = (count: number, one: string, many = `${one}s`): string =>
  Math.round(Math.abs(count)) === 1 ? one : many;

const ordinal = (value: number): string => {
  const n = Math.round(Math.abs(value));
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};

/** "25 Jan" — short enough to sit at the end of a chip. */
export const shortDate = (iso: string | null): string => {
  if (!iso) return '';
  const date = parseLocalDate(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`;
};

/**
 * `anglesRules.venueBucket` labels a night with no location "Unspecified",
 * which is a database value, not something to say out loud.
 */
const venuePhrase = (label: string | null): string =>
  !label || label.toLowerCase() === 'unspecified'
    ? 'on nights with no venue logged'
    : `at ${label}`;

// ---- The sentences ----------------------------------------------------------

export function angleSentence(angle: StoryAngle, options: AngleCopyOptions = {}): string {
  const { currency } = options;
  const money = (value: number) => formatMoney(value, { currency, signed: true });
  const flat = (value: number) => formatMoney(value, { currency });

  const value = angle.value;
  const other = angle.comparisonValue;
  const who = angle.subject?.playerName ?? 'the group';
  const when = shortDate(angle.date);

  switch (angle.id) {
    // --- Rivalry ---
    case 'nemesis':
      return `${who} has won ${value} of their ${other} nights together`;
    case 'favourite-victim':
      return `Has taken ${who} in ${value} of their ${other} nights together`;
    case 'played-together':
      return `${value} nights across the table from ${who}`;

    // --- Attendance ---
    case 'attendance-streak':
      return other !== null && value >= other
        ? `Has never missed a night — all ${other} of them`
        : `${capitalize(spell(value))} nights in a row without missing one`;
    case 'attendance-rate':
      return `At the table for ${formatPercent(value / 100)} of ${other} nights`;
    case 'gone-missing':
      return when
        ? `Missing ${spell(value)} nights running — last seen ${when}`
        : `Missing ${spell(value)} nights running`;

    // --- Drought ---
    case 'drought':
      return when
        ? `No win in ${spell(value)} nights — the last was ${when}`
        : `No win in ${spell(value)} nights`;
    case 'never-won':
      return `Still hunting a first win, ${spell(value)} nights in`;

    // --- Splits ---
    case 'best-day':
      return `${angle.label}s pay: ${money(value)} a night against ${money(other ?? 0)} overall`;
    case 'worst-day':
      return `${angle.label}s cost: ${money(value)} a night against ${money(other ?? 0)} overall`;
    case 'best-venue':
      return `Wins ${venuePhrase(angle.label)}: ${money(value)} a night`;
    case 'worst-venue':
      return `Bleeds ${venuePhrase(angle.label)}: ${money(value)} a night`;
    case 'best-table-size':
      return `Sharper ${angle.label}: ${money(value)} a night`;
    case 'worst-table-size':
      return `Struggles ${angle.label}: ${money(value)} a night`;

    // --- Rebuys ---
    case 'rebuy-dollars':
      return `${flat(value)} of rebuys across ${spell(other ?? 0)} ${plural(
        other ?? 0,
        'trip'
      )} back to the table`;

    // --- Nights ---
    case 'career-night':
      return when ? `Career night: ${money(value)} on ${when}` : `Career night: ${money(value)}`;
    case 'night-rank':
      return value === 1
        ? `Their last night was the best night of their ${other}`
        : `Their last night ranked ${ordinal(value)} best of ${other}`;

    // --- Form ---
    case 'heater':
      return `${capitalize(spell(value))} straight wins and counting`;
    case 'slump':
      return `${capitalize(spell(value))} straight losses`;

    // --- Departures ---
    case 'early-exit':
      return `Leaves early and pays for it: ${money(value)} a night against ${money(
        other ?? 0
      )} when staying`;

    // --- Career floor ---
    case 'career-balance':
      return `${money(value)} across ${other} ${plural(other ?? 0, 'night')}`;
    case 'newcomer':
      return `${capitalize(spell(value))} ${plural(value, 'night')} in — the book is still open`;
    case 'never-played':
      return 'Yet to take a seat';

    default:
      return '';
  }
}

// ---- Choosing which angle a row gets ----------------------------------------

/**
 * Angles a standings row already tells you without help.
 *
 * The row prints the balance and a streak pill, so "-$55 across 19 nights" and
 * "seven straight losses" are the chip restating the two figures beside it. The
 * whole point of the chip is to give the row something it does not already have
 * — especially for the player in last place.
 */
export const ROW_REDUNDANT_ANGLES: readonly StoryAngleId[] = [
  'career-balance',
  'heater',
  'slump',
];

export interface PickAngleOptions {
  /** Angle ids already spoken for elsewhere on the board. */
  taken?: ReadonlySet<StoryAngleId>;
  /** Override the redundancy list — a card that shows no streak can use it. */
  redundant?: readonly StoryAngleId[];
}

/**
 * The best angle this row can actually say something with.
 *
 * Four passes, each a relaxation of the last, because "no chip" is the failure
 * the redesign exists to fix: an earned, unspoken, non-redundant angle first;
 * then allow the guaranteed fallback; then allow a redundant one; then take
 * whatever is left. The server already returns them best-first, but they are
 * re-sorted here so the function does not depend on that.
 */
export function pickStoryAngle(
  angles: readonly StoryAngle[] | undefined,
  { taken, redundant = ROW_REDUNDANT_ANGLES }: PickAngleOptions = {}
): StoryAngle | null {
  if (!angles || angles.length === 0) return null;

  const ranked = [...angles].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const isRedundant = (a: StoryAngle) => redundant.includes(a.id);
  const isTaken = (a: StoryAngle) => Boolean(taken?.has(a.id));

  return (
    ranked.find((a) => !a.fallback && !isRedundant(a) && !isTaken(a)) ??
    ranked.find((a) => !isRedundant(a) && !isTaken(a)) ??
    ranked.find((a) => !isTaken(a)) ??
    ranked[0] ??
    null
  );
}

/**
 * One angle per player across the whole board, avoiding repetition.
 *
 * Without this, three of five rows in the live group all say "$N of rebuys" —
 * every sentence true, the board as a whole saying nothing. Assignment is
 * greedy in the order given (standings order, so the leader picks first) and
 * an id is only claimed when the player had a genuine alternative; a player
 * whose every angle is taken repeats one rather than going blank.
 */
export function assignStoryAngles(
  playerIdsInOrder: readonly string[],
  players: readonly PlayerAngles[] | undefined
): Record<string, StoryAngle | null> {
  const byPlayer = new Map((players ?? []).map((p) => [p.playerId, p.angles]));
  const taken = new Set<StoryAngleId>();
  const assigned: Record<string, StoryAngle | null> = {};

  for (const playerId of playerIdsInOrder) {
    const angles = byPlayer.get(playerId);
    if (!angles) continue;
    const picked = pickStoryAngle(angles, { taken });
    assigned[playerId] = picked;
    if (picked) taken.add(picked.id);
  }

  return assigned;
}

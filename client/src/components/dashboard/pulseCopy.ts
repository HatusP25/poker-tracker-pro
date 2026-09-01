import { formatMoney } from '@/lib/viz/money';
import { moneySign, type MoneySign } from '@/lib/viz/sign';
import { formatLocalDate } from '@/lib/dateUtils';
import type { BeltLineage, PlayerAngles, StoryAngle } from '@/types';

/**
 * The home screen's words.
 *
 * The server returns *facts* — `{ id: 'nemesis', value: 13, comparisonValue: 19,
 * subject: { playerName: 'Lucho' } }` — and never prose (DECISIONS D-007). This
 * module is the client side of that contract: one place that turns a scored
 * angle into a sentence, so tone and phrasing can change without a server
 * deploy, and so the same fact reads correctly whether it is addressed to the
 * person looking ("Lucho owns you") or reported about someone else ("Lucho owns
 * Muel").
 *
 * Everything here is a pure function over plain data, which is why it is
 * unit-tested rather than screenshot-checked.
 */

// ---- small helpers ----------------------------------------------------------

/** `3` -> `3rd`. The teens are all "th", which is the bit people get wrong. */
export const ordinal = (n: number): string => {
  const abs = Math.abs(Math.round(n));
  const tens = abs % 100;
  const ones = abs % 10;
  const suffix =
    tens >= 11 && tens <= 13 ? 'th' : ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th';
  return `${Math.round(n)}${suffix}`;
};

export const plural = (n: number, singular: string, pluralForm?: string): string =>
  Math.abs(n) === 1 ? singular : (pluralForm ?? `${singular}s`);

/**
 * Money for a sentence. Home-game figures are usually whole dollars, so the
 * default is no decimals — but a bucket *average* like -11.43 is meaningfully
 * not -11, so the cents survive when they exist.
 */
const money = (value: number, currency?: string | null, signed = true): string =>
  formatMoney(value, {
    currency,
    signed,
    decimals: Number.isInteger(value) ? 0 : 2,
  });

const shortDate = (iso: string): string => formatLocalDate(iso, 'MMM dd, yyyy');

/** Same calendar day, whatever timezone suffix each side arrived with. */
const sameDay = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && a.split('T')[0] === b.split('T')[0];

// ---- voice ------------------------------------------------------------------

export type AngleVoice = 'second' | 'third';

export interface AngleCopyOptions {
  /** The player the angle is *about*. Used verbatim in the third person. */
  name: string;
  /** `second` addresses the person looking; `third` reports on someone else. */
  voice?: AngleVoice;
  /** ISO code from `group.currency`. */
  currency?: string | null;
}

interface Voice {
  /** "You" / "Muel" */
  subject: string;
  /** "you" / "Muel" — the object of a verb. */
  object: string;
  /** "your" / "their" — possessive attached to a shared count. */
  their: string;
  /** "your" / "Muel's" — possessive attached to a thing they own. */
  possessive: string;
  /** "You've" / "Muel has" */
  have: string;
  /** "You haven't" / "Muel hasn't" */
  havent: string;
  /** "You're" / "Muel is" */
  are: string;
  /** "you stay" / "they stay" — a bare verb needing a pronoun subject. */
  they: string;
}

const voiceOf = (name: string, voice: AngleVoice): Voice =>
  voice === 'second'
    ? {
        subject: 'You',
        object: 'you',
        their: 'your',
        possessive: 'your',
        have: "You've",
        havent: "You haven't",
        are: "You're",
        they: 'you',
      }
    : {
        subject: name,
        object: name,
        their: 'their',
        possessive: `${name}'s`,
        have: `${name} has`,
        havent: `${name} hasn't`,
        are: `${name} is`,
        they: 'they',
      };

// ---- the copy ---------------------------------------------------------------

export interface AngleCopy {
  /** A two-or-three word tag. Sits above the figure. */
  kicker: string;
  /** The figure, already formatted. Never empty — "—" when there is none. */
  figure: string;
  /** Colours the figure. Undefined leaves it in plain foreground ink. */
  sign?: MoneySign;
  /** The sentence. Always ends in a full stop. */
  line: string;
}

/** brag/burn read as good-for-them / bad-for-them, which is what the ink means here. */
const toneSign = (angle: StoryAngle): MoneySign | undefined =>
  angle.tone === 'brag' ? 'profit' : angle.tone === 'burn' ? 'loss' : undefined;

/**
 * How a split bucket reads in a sentence. `Friday` is a day, `6-handed` is a
 * table, and the server's `Unspecified` venue is not a place at all — saying
 * "you win at Unspecified" would be worse than saying nothing.
 */
const splitSubject = (angleId: string, label: string | null): string => {
  const text = (label ?? '').trim();
  if (angleId.endsWith('day')) return text ? `${text}s` : 'That day';
  if (angleId.endsWith('table-size')) return text ? `${text} tables` : 'That table size';
  if (!text || text.toLowerCase() === 'unspecified') return 'Nights with no venue recorded';
  return text;
};

export function angleCopy(angle: StoryAngle, options: AngleCopyOptions): AngleCopy {
  const { name, voice = 'second', currency } = options;
  const v = voiceOf(name, voice);
  const value = angle.value;
  const comparison = angle.comparisonValue;
  const other = angle.subject?.playerName ?? 'someone';

  switch (angle.id) {
    case 'nemesis':
      return {
        kicker: 'Nemesis',
        figure: `${value}/${comparison ?? angle.sampleSize}`,
        sign: 'loss',
        line: `${other} has finished ahead of ${v.object} on ${value} of ${v.their} ${
          comparison ?? angle.sampleSize
        } shared nights.`,
      };

    case 'favourite-victim':
      return {
        kicker: 'Favourite victim',
        figure: `${value}/${comparison ?? angle.sampleSize}`,
        sign: 'profit',
        line: `${v.have} finished ahead of ${other} on ${value} of ${v.their} ${
          comparison ?? angle.sampleSize
        } shared nights.`,
      };

    case 'played-together':
      return {
        kicker: 'Regular partner',
        figure: `${value}`,
        line: `${v.subject} and ${other} have shared ${value} ${plural(value, 'night')} at the table.`,
      };

    case 'attendance-streak': {
      const perfect = comparison !== null && value >= comparison;
      return {
        kicker: perfect ? 'Perfect record' : 'On a run',
        figure: `${value}`,
        sign: 'profit',
        line: perfect
          ? `${v.havent} missed one of the group's ${value} nights.`
          : `${v.have} turned up for the last ${value} nights running.`,
      };
    }

    case 'attendance-rate':
      return {
        kicker: 'Always there',
        figure: `${Math.round(value)}%`,
        sign: 'profit',
        line: `${v.have} played ${Math.round(value)}% of the ${comparison ?? angle.sampleSize} nights since ${
          voice === 'second' ? 'you' : 'they'
        } started.`,
      };

    case 'gone-missing':
      return {
        kicker: 'Gone missing',
        figure: `${value}`,
        sign: 'loss',
        line: angle.date
          ? `${v.have} missed the last ${value} ${plural(value, 'night')} — last seen ${shortDate(angle.date)}.`
          : `${v.have} missed the last ${value} ${plural(value, 'night')}.`,
      };

    case 'drought':
      return {
        kicker: 'Drought',
        figure: `${value}`,
        sign: 'loss',
        line: angle.date
          ? `${v.havent} won a night since ${shortDate(angle.date)} — ${value} ${plural(
              value,
              'night'
            )} ago.`
          : `${v.have} gone ${value} ${plural(value, 'night')} without a win.`,
      };

    case 'never-won':
      return {
        kicker: 'Still waiting',
        figure: `${value}`,
        sign: 'loss',
        line: `${v.are} ${value} ${plural(value, 'night')} in and still chasing a first winning night.`,
      };

    case 'best-day':
    case 'worst-day':
    case 'best-venue':
    case 'worst-venue':
    case 'best-table-size':
    case 'worst-table-size': {
      const kicker =
        angle.id === 'best-day'
          ? 'Best day'
          : angle.id === 'worst-day'
            ? 'Worst day'
            : angle.id === 'best-venue'
              ? 'Best venue'
              : angle.id === 'worst-venue'
                ? 'Worst venue'
                : angle.id === 'best-table-size'
                  ? 'Best table'
                  : 'Worst table';
      return {
        kicker,
        figure: money(value, currency),
        sign: moneySign(value),
        line: `${splitSubject(angle.id, angle.label)}: ${money(value, currency)} a night, against ${
          v.possessive
        } usual ${money(comparison ?? 0, currency)}.`,
      };
    }

    case 'rebuy-dollars':
      return {
        kicker: 'Rebuy dollars',
        figure: money(value, currency, false),
        sign: 'loss',
        line: `${v.have} put ${money(value, currency, false)} back on the table across ${
          comparison ?? angle.sampleSize
        } ${plural(comparison ?? 0, 'rebuy')}.`,
      };

    case 'early-exit':
      return {
        kicker: 'Early exits',
        figure: money(value, currency),
        sign: moneySign(value),
        line: `Leaving early costs ${v.object}: ${money(value, currency)} a night, against ${money(
          comparison ?? 0,
          currency
        )} when ${v.they} stay.`,
      };

    case 'career-night':
      return {
        kicker: 'Career night',
        figure: money(value, currency),
        sign: moneySign(value),
        line: angle.date
          ? `${v.possessive === 'your' ? 'Your' : v.possessive} best night ever: ${money(
              value,
              currency
            )} on ${shortDate(angle.date)}.`
          : `${v.possessive === 'your' ? 'Your' : v.possessive} best night ever: ${money(value, currency)}.`,
      };

    case 'night-rank': {
      const outOf = comparison ?? angle.sampleSize;
      return {
        kicker: 'Last night',
        figure: ordinal(value),
        sign: toneSign(angle),
        line:
          angle.tone === 'brag'
            ? `Last night was ${v.possessive} ${ordinal(value)}-best of ${outOf}.`
            : `Last night ranked ${ordinal(value)} of ${v.possessive} ${outOf}.`,
      };
    }

    case 'heater':
      return {
        kicker: 'Heater',
        figure: `${value}`,
        sign: 'profit',
        line: `${v.have} won the last ${value} ${plural(value, 'night')} in a row.`,
      };

    case 'slump':
      return {
        kicker: 'Slump',
        figure: `${value}`,
        sign: 'loss',
        line: `${v.have} lost the last ${value} ${plural(value, 'night')} in a row.`,
      };

    case 'newcomer':
      return {
        kicker: 'New face',
        figure: `${value}`,
        line: `${value} ${plural(value, 'night')} in — the book on ${v.object} is still empty.`,
      };

    case 'never-played':
      return {
        kicker: 'Yet to play',
        figure: '—',
        line: `${v.havent} played a night yet.`,
      };

    case 'career-balance':
    default: {
      const nights = comparison ?? angle.sampleSize;
      const sign = moneySign(value);
      return {
        kicker: 'Career',
        figure: money(value, currency),
        sign,
        line:
          sign === 'neutral'
            ? `${v.subject} ${voice === 'second' ? 'are' : 'is'} dead even across ${nights} ${plural(
                nights,
                'night'
              )}.`
            : `${v.are} ${money(value, currency)} across ${nights} ${plural(nights, 'night')}.`,
      };
    }
  }
}

// ---- the group spread -------------------------------------------------------

export interface SpreadItem {
  player: PlayerAngles;
  angle: StoryAngle;
}

export interface SpreadOptions {
  count?: number;
  /** The viewer — their angles already have a band of their own above. */
  excludePlayerId?: string | null;
  /**
   * Rotates which angle each player leads with, so the home screen is not the
   * same three sentences every day. Feed it a day index.
   */
  seed?: number;
}

/**
 * A handful of angles spread *across* the group rather than piled on the leader.
 *
 * One angle per player, best score first, and — where a player has an
 * alternative — no two cards telling the same kind of story, because three
 * consecutive "on a losing run" cards is one fact, not three.
 */
export function spreadAngles(
  players: PlayerAngles[] | undefined | null,
  options: SpreadOptions = {}
): SpreadItem[] {
  const { count = 3, excludePlayerId = null, seed = 0 } = options;
  if (!players || players.length === 0) return [];

  const eligible = players.filter(
    (p) =>
      p.playerId !== excludePlayerId &&
      p.games > 0 &&
      p.angles.length > 0 &&
      p.angles.some((a) => a.id !== 'never-played')
  );

  // Each player's angles, rotated by the seed so the lead angle moves day to day.
  const rotated = eligible.map((player) => {
    const usable = player.angles.filter((a) => a.id !== 'never-played');
    const offset = ((seed % usable.length) + usable.length) % usable.length;
    return {
      player,
      angles: [...usable.slice(offset), ...usable.slice(0, offset)],
    };
  });

  rotated.sort((a, b) => b.angles[0].score - a.angles[0].score);

  const chosen: SpreadItem[] = [];
  const usedFamilies = new Set<string>();

  for (const entry of rotated) {
    if (chosen.length >= count) break;
    const fresh = entry.angles.find((a) => !usedFamilies.has(a.family));
    const angle = fresh ?? entry.angles[0];
    usedFamilies.add(angle.family);
    chosen.push({ player: entry.player, angle });
  }

  return chosen.slice(0, count);
}

// ---- the belt ---------------------------------------------------------------

export interface BeltSummary {
  holderId: string;
  holderName: string;
  /** ISO date of the night the current reign began. */
  sinceDate: string;
  nightsHeld: number;
  defenses: number;
  /** Null only for the very first champion. */
  takenFrom: string | null;
  totalTitleChanges: number;
  /** The longest reign on record, current one included — the bar to beat. */
  longestReign: { playerName: string; nightsHeld: number } | null;
  /** Did the belt change hands on this session's date? */
  changedHandsOn: (sessionDate: string | null | undefined) => boolean;
}

export function beltSummary(lineage: BeltLineage | null | undefined): BeltSummary | null {
  const current = lineage?.current;
  if (!lineage || !current) return null;

  const reigns = [...lineage.history, current];
  const longest = reigns.reduce(
    (best, r) => (best === null || r.nightsHeld > best.nightsHeld ? r : best),
    null as (typeof reigns)[number] | null
  );

  return {
    holderId: current.playerId,
    holderName: current.playerName,
    sinceDate: current.fromDate,
    nightsHeld: current.nightsHeld,
    defenses: current.defenses,
    takenFrom: current.takenFromPlayerName,
    totalTitleChanges: lineage.totalTitleChanges,
    longestReign: longest
      ? { playerName: longest.playerName, nightsHeld: longest.nightsHeld }
      : null,
    changedHandsOn: (sessionDate) => sameDay(current.fromDate, sessionDate),
  };
}

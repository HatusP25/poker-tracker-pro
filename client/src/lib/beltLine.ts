import type { BeltLineage } from '@/types';

export interface BeltLineInput {
  sessionDate: string;
  sessionPlayerIds: string[]; // ids of players who played in this session
  belt: BeltLineage | null | undefined;
}

const ordinal = (n: number): string => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
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

const sameDay = (a: string, b: string) => a.slice(0, 10) === b.slice(0, 10);

/**
 * Derives the "Belt" line for the copy-for-WhatsApp message and any belt
 * chip on a session page, by comparing the current reign to this session:
 * - Reign started on this session's date → the belt changed hands tonight.
 * - Otherwise, if the current holder played tonight → they defended it.
 * - Otherwise (holder absent, no title change) → the belt wasn't in play.
 */
export function deriveBeltLine({ sessionDate, sessionPlayerIds, belt }: BeltLineInput): string | undefined {
  if (!belt?.current) return undefined;
  const { current } = belt;

  if (sameDay(current.fromDate, sessionDate)) {
    return current.takenFromPlayerName
      ? `${current.playerName} takes The Belt from ${current.takenFromPlayerName}`
      : `${current.playerName} becomes the first champion`;
  }

  if (sessionPlayerIds.includes(current.playerId)) {
    return `${current.playerName} defends (${ordinal(current.defenses)} defense)`;
  }

  return undefined;
}

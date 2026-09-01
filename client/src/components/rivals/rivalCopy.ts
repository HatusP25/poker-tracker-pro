/**
 * The words on the Rivals tab.
 *
 * Kept apart from `rivalMatrix.ts` on purpose: that module decides what is
 * true, this one decides how it is said. Same split as the angles pipeline,
 * where the server returns facts and the client owns every sentence (D-007).
 */

/** `13–5`. An en dash, because a hyphen next to numerals reads as minus. */
export const formatRecord = (wins: number, losses: number): string => `${wins}–${losses}`;

/** `1 tie` / `3 ties`, or nothing at all when there were none. */
export const tieNote = (ties: number): string | null =>
  ties > 0 ? `${ties} tie${ties === 1 ? '' : 's'}` : null;

export const nightsLabel = (nights: number): string =>
  `${nights} night${nights === 1 ? '' : 's'}`;

/**
 * The run one player is currently on. Reads as a sentence rather than a
 * counter, because "Lucho ×4" is a scoreboard and this is a taunt.
 */
export const streakLine = (holderName: string | null, count: number): string | null => {
  if (!holderName || count < 1) return null;
  return count === 1
    ? `${holderName} took the last one`
    : `${holderName} has taken the last ${count}`;
};

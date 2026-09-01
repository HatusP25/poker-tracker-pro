import type { PlayerForm } from '@/types';

/**
 * Who is hot and who is cold — as two names, not a wall.
 *
 * The form board used to render every active player into one uncapped grid of
 * identical tiles, so the answer to "who's running good?" was buried among five
 * or nine equal-weight cards you had to read in full to find it. The question
 * has two answers; they should be the two biggest things on the section.
 *
 * `hot` and `cold` are strictly comparative — the hottest player in a group
 * that is all losing is still the hottest — so the copy around them stays
 * relative ("hottest right now"), and the true sentence lives in the card.
 */

export interface FormBoard {
  hot: PlayerForm | null;
  cold: PlayerForm | null;
  /** Everyone else, hottest first, with the no-evidence players last. */
  rest: PlayerForm[];
}

/** A player the app can honestly say anything about. */
const hasEvidence = (player: PlayerForm): boolean => player.recentGames > 0;

const TRAJECTORY_WEIGHT: Record<PlayerForm['trajectory'], number> = {
  up: 10,
  flat: 0,
  down: -10,
};

/**
 * How hot a player is, on one axis.
 *
 * The badges are the server's own verdict and dominate — a heater outranks a
 * good record, a slump undercuts a bad one — but they never *replace* the
 * record, so two heaters still separate on the nights they actually won.
 */
export function heatScore(player: PlayerForm): number {
  const badge = player.badge === 'heater' ? 100 : player.badge === 'slump' ? -100 : 0;
  const winRate = player.recentGames > 0 ? player.recentWins / player.recentGames : 0;
  const streak =
    player.streakType === 'win'
      ? Math.min(player.currentStreak, 5) * 2
      : player.streakType === 'loss'
        ? -Math.min(player.currentStreak, 5) * 2
        : 0;

  return badge + TRAJECTORY_WEIGHT[player.trajectory] + winRate * 20 + streak;
}

export function splitFormBoard(players: readonly PlayerForm[]): FormBoard {
  // Ties broken by name: without it the board reshuffles between renders for
  // no reason a reader could explain.
  const byHeat = (a: PlayerForm, b: PlayerForm) =>
    heatScore(b) - heatScore(a) || a.playerName.localeCompare(b.playerName);

  const ranked = players.filter(hasEvidence).sort(byHeat);
  const dormant = players.filter((p) => !hasEvidence(p)).sort(byHeat);

  const hot = ranked.length > 0 ? ranked[0] : null;
  // One player is the hottest by default; calling them the coldest as well
  // would be a joke the app is not in on.
  const cold = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  const rest = [...ranked.slice(hot ? 1 : 0, cold ? ranked.length - 1 : ranked.length), ...dormant];

  return { hot, cold, rest };
}

/**
 * How a player is named on the personality surfaces.
 *
 * Home games run on nicknames, but they only belong where the app is telling a
 * story — the belt, the trophy case, night titles, share cards. Data-dense views
 * (leaderboard, tables, charts) keep using the plain name, where a long handle
 * would just cost a column.
 */

export interface NameableePlayer {
  name: string;
  nickname?: string | null;
}

/** A nickname worth showing: present, not blank, and not just the name again. */
export function hasNickname(player: NameableePlayer): boolean {
  const nickname = player.nickname?.trim();
  if (!nickname) return false;
  return nickname.toLowerCase() !== player.name.trim().toLowerCase();
}

/** `Ana "The Closer"`, or just `Ana` when there is no nickname worth showing. */
export function displayName(player: NameableePlayer): string {
  if (!hasNickname(player)) return player.name;
  const nickname = player.nickname!.trim();
  return player.name ? `${player.name} "${nickname}"` : `"${nickname}"`;
}

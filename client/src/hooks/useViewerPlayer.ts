import { useCallback, useEffect, useState } from 'react';

/**
 * Who is looking at the app.
 *
 * There is no auth here and no server-side notion of a current user, so the
 * honest answer is to ask. The home screen offers the roster once, remembers
 * the pick on this device, and from then on can address the reader directly
 * instead of only ever talking about whoever is winning.
 *
 * Per group, because one person can be in two groups and be a different seat
 * in each. Same storage idiom as GroupContext and RoleContext, with the reads
 * and writes guarded — Safari private mode throws on `localStorage` access
 * rather than returning null, and a home screen that white-screens because
 * nobody could remember a name would be a poor trade.
 */

const keyFor = (groupId: string) => `pulse.viewer.${groupId}`;

const read = (groupId: string): string | null => {
  if (!groupId) return null;
  try {
    return localStorage.getItem(keyFor(groupId));
  } catch {
    return null;
  }
};

const write = (groupId: string, playerId: string | null): void => {
  if (!groupId) return;
  try {
    if (playerId) localStorage.setItem(keyFor(groupId), playerId);
    else localStorage.removeItem(keyFor(groupId));
  } catch {
    /* storage unavailable — the pick just does not survive the session */
  }
};

export interface ViewerPlayer {
  /** The remembered player id for this group, or null if they have not said. */
  playerId: string | null;
  setPlayerId: (playerId: string | null) => void;
  /** Back to "who's looking?" — the affordance for a shared laptop. */
  clear: () => void;
}

export const useViewerPlayer = (groupId: string): ViewerPlayer => {
  const [playerId, setState] = useState<string | null>(() => read(groupId));

  // Switching groups switches seats.
  useEffect(() => {
    setState(read(groupId));
  }, [groupId]);

  const setPlayerId = useCallback(
    (next: string | null) => {
      write(groupId, next);
      setState(next);
    },
    [groupId]
  );

  const clear = useCallback(() => setPlayerId(null), [setPlayerId]);

  return { playerId, setPlayerId, clear };
};

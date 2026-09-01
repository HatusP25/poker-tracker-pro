import { useMemo } from 'react';
import { usePlayersByGroup } from '@/hooks/usePlayers';
import { useSessionsByGroup } from '@/hooks/useSessions';
import { useGroupAngles } from '@/hooks/useAngles';
import {
  DEFAULT_RIVAL_THRESHOLDS,
  buildRivalMatrix,
  type RivalMatrix,
  type RivalThresholds,
} from '@/components/rivals/rivalMatrix';
import type { Player } from '@/types';

/**
 * Everything the Rivals tab needs, from queries the app has already made.
 *
 * The sessions list and the roster are both cached by other surfaces, so the
 * whole head-to-head grid usually costs zero extra requests — which is the
 * reason it is built on the client at all rather than asked for one pairing
 * at a time.
 *
 * Thresholds come from the angles payload when it has landed, so the gate the
 * grid applies is literally the gate the server applies rather than a copy of
 * it that can drift. It is deliberately not blocking: if that request is slow
 * or fails, the grid renders on the mirrored defaults.
 */
export interface UseRivalsResult {
  matrix: RivalMatrix;
  thresholds: RivalThresholds;
  /** Roster lookup, for nicknames on the story surfaces. */
  playersById: Map<string, Player>;
  isLoading: boolean;
  isError: boolean;
}

export const useRivals = (groupId: string): UseRivalsResult => {
  const sessions = useSessionsByGroup(groupId);
  const players = usePlayersByGroup(groupId);
  const angles = useGroupAngles(groupId);

  const thresholds = useMemo<RivalThresholds>(
    () => ({
      minSessions:
        angles.data?.thresholds?.rivalryMinSessions ?? DEFAULT_RIVAL_THRESHOLDS.minSessions,
      minDominance: DEFAULT_RIVAL_THRESHOLDS.minDominance,
    }),
    [angles.data?.thresholds?.rivalryMinSessions]
  );

  const matrix = useMemo(
    () => buildRivalMatrix(sessions.data ?? [], players.data ?? []),
    [sessions.data, players.data]
  );

  const playersById = useMemo(
    () => new Map((players.data ?? []).map((p) => [p.id, p])),
    [players.data]
  );

  return {
    matrix,
    thresholds,
    playersById,
    isLoading: sessions.isLoading || players.isLoading,
    isError: sessions.isError || players.isError,
  };
};

import { useQuery } from '@tanstack/react-query';
import { anglesApi } from '@/lib/api';
import type { GroupAnglesResponse, PlayerAngles, StoryAngle } from '@/types';

/**
 * The whole angles matrix for a group. Every other hook in this file reads from
 * this one query, so a page showing the hub, the rivals grid and a player card at
 * once still makes exactly one request.
 */
export const useGroupAngles = (groupId: string) =>
  useQuery({
    queryKey: ['angles', 'group', groupId],
    queryFn: async () => (await anglesApi.getGroupAngles(groupId)).data,
    enabled: !!groupId,
  });

/** One player's slice of the matrix. Shares the group query's cache entry. */
export const usePlayerAngles = (groupId: string, playerId: string | null | undefined) =>
  useQuery({
    queryKey: ['angles', 'group', groupId],
    queryFn: async () => (await anglesApi.getGroupAngles(groupId)).data,
    enabled: !!groupId && !!playerId,
    select: (data: GroupAnglesResponse): PlayerAngles | null =>
      data.players.find((p) => p.playerId === playerId) ?? null,
  });

/**
 * One player's story angles, best first. Never empty for a player on the roster —
 * the server guarantees a fallback angle rather than nothing.
 */
export const usePlayerStoryAngles = (
  groupId: string,
  playerId: string | null | undefined,
  limit?: number
) =>
  useQuery({
    queryKey: ['angles', 'group', groupId],
    queryFn: async () => (await anglesApi.getGroupAngles(groupId)).data,
    enabled: !!groupId && !!playerId,
    select: (data: GroupAnglesResponse): StoryAngle[] => {
      const player = data.players.find((p) => p.playerId === playerId);
      if (!player) return [];
      return limit === undefined ? player.angles : player.angles.slice(0, limit);
    },
  });

/** The co-attendance matrix, most-shared pairs first. */
export const useCoAttendance = (groupId: string) =>
  useQuery({
    queryKey: ['angles', 'group', groupId],
    queryFn: async () => (await anglesApi.getGroupAngles(groupId)).data,
    enabled: !!groupId,
    select: (data: GroupAnglesResponse) => data.coAttendance,
  });

/** The group-wide day-of-week / venue / table-size splits. */
export const useGroupSplits = (groupId: string) =>
  useQuery({
    queryKey: ['angles', 'group', groupId],
    queryFn: async () => (await anglesApi.getGroupAngles(groupId)).data,
    enabled: !!groupId,
    select: (data: GroupAnglesResponse) => data.splits,
  });

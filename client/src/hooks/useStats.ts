import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import type { LeaderboardTimeframe } from '@/types';

export const usePlayerStats = (playerId: string) => {
  return useQuery({
    queryKey: ['stats', 'player', playerId],
    queryFn: async () => {
      const response = await statsApi.getPlayerStats(playerId);
      return response.data;
    },
    enabled: !!playerId,
  });
};

export const useLeaderboard = (
  groupId: string,
  minGames?: number,
  timeframe: LeaderboardTimeframe = 'all'
) => {
  return useQuery({
    queryKey: ['stats', 'leaderboard', groupId, minGames, timeframe],
    queryFn: async () => {
      const response = await statsApi.getLeaderboard(groupId, minGames, timeframe);
      return response.data;
    },
    enabled: !!groupId,
  });
};

export const useDashboardStats = (groupId: string) => {
  return useQuery({
    queryKey: ['stats', 'dashboard', groupId],
    queryFn: async () => {
      const response = await statsApi.getDashboard(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });
};


export const usePlayerStreaks = (groupId: string) => {
  return useQuery({
    queryKey: ['stats', 'streaks', groupId],
    queryFn: async () => {
      const response = await statsApi.getPlayerStreaks(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });
};


export const usePlayerPerformanceTrend = (playerId: string) => {
  return useQuery({
    queryKey: ['stats', 'performance-trend', playerId],
    queryFn: async () => {
      const response = await statsApi.getPlayerPerformanceTrend(playerId);
      return response.data;
    },
    enabled: !!playerId,
  });
};

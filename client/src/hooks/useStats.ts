import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';

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

export const useLeaderboard = (groupId: string, minGames?: number) => {
  return useQuery({
    queryKey: ['stats', 'leaderboard', groupId, minGames],
    queryFn: async () => {
      const response = await statsApi.getLeaderboard(groupId, minGames);
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

export const useProfitTrend = (groupId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
  return useQuery({
    queryKey: ['stats', 'trend', groupId, period],
    queryFn: async () => {
      const response = await statsApi.getProfitTrend(groupId, period);
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

export const useAggregatedStats = (groupId: string, year: number, month?: number) => {
  return useQuery({
    queryKey: ['stats', 'aggregates', groupId, year, month],
    queryFn: async () => {
      const response = await statsApi.getAggregatedStats(groupId, year, month);
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

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

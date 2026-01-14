import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { playersApi } from '@/lib/api';

export const usePlayersByGroup = (groupId: string, activeOnly?: boolean) => {
  return useQuery({
    queryKey: ['players', groupId, activeOnly],
    queryFn: async () => {
      const response = await playersApi.getByGroup(groupId, activeOnly);
      return response.data;
    },
    enabled: !!groupId,
  });
};

export const usePlayer = (id: string) => {
  return useQuery({
    queryKey: ['players', id],
    queryFn: async () => {
      const response = await playersApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreatePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { groupId: string; name: string; avatarUrl?: string }) => playersApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['players', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Player created successfully');
    },
    onError: () => {
      toast.error('Failed to create player');
    },
  });
};

export const useUpdatePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; avatarUrl?: string; isActive?: boolean } }) =>
      playersApi.update(id, data),
    onSuccess: (response) => {
      const player = response.data;
      queryClient.invalidateQueries({ queryKey: ['players', player.groupId] });
      queryClient.invalidateQueries({ queryKey: ['players', player.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Player updated successfully');
    },
    onError: () => {
      toast.error('Failed to update player');
    },
  });
};

export const useTogglePlayerActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => playersApi.toggleActive(id),
    onSuccess: (response) => {
      const player = response.data;
      queryClient.invalidateQueries({ queryKey: ['players', player.groupId] });
      queryClient.invalidateQueries({ queryKey: ['players', player.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(`Player ${player.isActive ? 'activated' : 'deactivated'} successfully`);
    },
    onError: () => {
      toast.error('Failed to toggle player status');
    },
  });
};

export const useDeletePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => playersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Player deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete player');
    },
  });
};

export const useSearchPlayers = (groupId: string, query: string) => {
  return useQuery({
    queryKey: ['players', groupId, 'search', query],
    queryFn: async () => {
      const response = await playersApi.search(groupId, query);
      return response.data;
    },
    enabled: !!groupId && query.length > 0,
  });
};

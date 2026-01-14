import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sessionsApi } from '@/lib/api';

export const useSessionsByGroup = (groupId: string, limit?: number) => {
  return useQuery({
    queryKey: ['sessions', groupId, limit],
    queryFn: async () => {
      const response = await sessionsApi.getByGroup(groupId, limit);
      return response.data;
    },
    enabled: !!groupId,
  });
};

export const useSession = (id: string) => {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: async () => {
      const response = await sessionsApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      groupId: string;
      date: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      notes?: string;
      photoUrls?: string[];
      entries: Array<{ playerId: string; buyIn: number; cashOut: number }>;
    }) => sessionsApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Session created successfully');
    },
    onError: () => {
      toast.error('Failed to create session');
    },
  });
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        date?: string;
        startTime?: string;
        endTime?: string;
        location?: string;
        notes?: string;
        photoUrls?: string[];
      };
    }) => sessionsApi.update(id, data),
    onSuccess: (response) => {
      const session = response.data;
      queryClient.invalidateQueries({ queryKey: ['sessions', session.groupId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', session.id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Session updated successfully');
    },
    onError: () => {
      toast.error('Failed to update session');
    },
  });
};

export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sessionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Session moved to trash');
    },
    onError: () => {
      toast.error('Failed to delete session');
    },
  });
};

export const useRestoreSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sessionsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Session restored successfully');
    },
    onError: () => {
      toast.error('Failed to restore session');
    },
  });
};

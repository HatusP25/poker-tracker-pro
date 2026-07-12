import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { liveSessionsApi } from '@/lib/api';

export const useStartLiveSession = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      groupId: string;
      date: string;
      startTime: string;
      location?: string;
      players: Array<{ playerId: string; buyIn: number }>;
    }) => liveSessionsApi.start(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Live session started!');
      navigate(`/live/${response.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to start session');
    },
  });
};

export const useLiveSession = (sessionId: string) => {
  return useQuery({
    queryKey: ['live-session', sessionId],
    queryFn: async () => {
      const response = await liveSessionsApi.get(sessionId);
      return response.data;
    },
    enabled: !!sessionId,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
};

export const useAddRebuy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, playerId, amount }: { sessionId: string; playerId: string; amount: number }) =>
      liveSessionsApi.addRebuy(sessionId, { playerId, amount }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['live-session', variables.sessionId] });
      toast.success('Rebuy added');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add rebuy');
    },
  });
};

export const useUpdateRebuy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, rebuyId, amount }: { sessionId: string; rebuyId: string; amount: number }) =>
      liveSessionsApi.updateRebuy(sessionId, rebuyId, { amount }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['live-session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Rebuy updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update rebuy');
    },
  });
};

export const useDeleteRebuy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, rebuyId }: { sessionId: string; rebuyId: string }) =>
      liveSessionsApi.deleteRebuy(sessionId, rebuyId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['live-session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Rebuy removed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove rebuy');
    },
  });
};

export const useAddPlayerToSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, playerId, buyIn }: { sessionId: string; playerId: string; buyIn: number }) =>
      liveSessionsApi.addPlayer(sessionId, { playerId, buyIn }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['live-session', variables.sessionId] });
      toast.success('Player added to session');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add player');
    },
  });
};

export const useEndLiveSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      endTime,
      cashOuts,
    }: {
      sessionId: string;
      endTime: string;
      cashOuts: Array<{ playerId: string; cashOut: number }>;
    }) => liveSessionsApi.end(sessionId, { endTime, cashOuts }),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['live-session', variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Session completed!');
      // Note: Navigation is now handled by the component to allow for session summary modal
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to end session');
    },
  });
};

export const useForceEndSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => liveSessionsApi.forceEnd(sessionId, new Date()),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['live-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Session force ended');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to force end session');
    },
  });
};

export const useReopenSession = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => liveSessionsApi.reopen(sessionId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['live-session', response.data.id] });
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
      toast.success('Session reopened');
      navigate(`/live/${response.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reopen session');
    },
  });
};

export const useActiveSessions = (groupId: string) => {
  return useQuery({
    queryKey: ['live-sessions', 'active', groupId],
    queryFn: async () => {
      const response = await liveSessionsApi.getActive(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });
};

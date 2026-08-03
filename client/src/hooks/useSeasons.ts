import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { seasonsApi } from '@/lib/api';

/**
 * Group-defined seasons. A group with none simply gets an empty list, and every
 * season-aware view falls back to calendar years.
 */

export const useSeasons = (groupId: string) =>
  useQuery({
    queryKey: ['seasons', groupId],
    queryFn: async () => (await seasonsApi.getByGroup(groupId)).data,
    enabled: !!groupId,
  });

export const useCurrentSeason = (groupId: string) =>
  useQuery({
    queryKey: ['seasons', 'current', groupId],
    queryFn: async () => (await seasonsApi.getCurrent(groupId)).data,
    enabled: !!groupId,
  });

/** Season changes shift what every recap covers, so invalidate insights too. */
const invalidate = (queryClient: ReturnType<typeof useQueryClient>, groupId: string) => {
  queryClient.invalidateQueries({ queryKey: ['seasons', groupId] });
  queryClient.invalidateQueries({ queryKey: ['seasons', 'current', groupId] });
  queryClient.invalidateQueries({ queryKey: ['insights'] });
};

const errorMessage = (error: any, fallback: string) =>
  error.response?.data?.message || error.response?.data?.error || fallback;

export const useCreateSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { groupId: string; name: string; startDate: string; endDate: string }) =>
      seasonsApi.create(data),
    onSuccess: (_, variables) => {
      invalidate(queryClient, variables.groupId);
      toast.success('Season created');
    },
    onError: (error: any) => toast.error(errorMessage(error, 'Failed to create season')),
  });
};

export const useUpdateSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      groupId: string;
      data: { name?: string; startDate?: string; endDate?: string };
    }) => seasonsApi.update(id, data),
    onSuccess: (_, variables) => {
      invalidate(queryClient, variables.groupId);
      toast.success('Season updated');
    },
    onError: (error: any) => toast.error(errorMessage(error, 'Failed to update season')),
  });
};

export const useDeleteSeason = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; groupId: string }) => seasonsApi.delete(id),
    onSuccess: (_, variables) => {
      invalidate(queryClient, variables.groupId);
      toast.success('Season removed');
    },
    onError: (error: any) => toast.error(errorMessage(error, 'Failed to remove season')),
  });
};

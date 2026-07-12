import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { playersApi } from '@/lib/api';

export const usePlayerNotes = (playerId: string) => {
  return useQuery({
    queryKey: ['players', playerId, 'notes'],
    queryFn: async () => {
      const response = await playersApi.getNotes(playerId);
      return response.data;
    },
    enabled: !!playerId,
  });
};

export const useCreatePlayerNote = (playerId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { note: string; tags?: string[] }) => playersApi.createNote(playerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', playerId, 'notes'] });
      toast.success('Note added');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add note');
    },
  });
};

export const useUpdatePlayerNote = (playerId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: { note?: string; tags?: string[] } }) =>
      playersApi.updateNote(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', playerId, 'notes'] });
      toast.success('Note updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update note');
    },
  });
};

export const useDeletePlayerNote = (playerId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => playersApi.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players', playerId, 'notes'] });
      toast.success('Note deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete note');
    },
  });
};

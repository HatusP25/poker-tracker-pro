import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';
import type { SessionSummary } from '@/types';

export const useSessionSummary = (sessionId: string, groupId: string) => {
  return useQuery<SessionSummary>({
    queryKey: ['session-summary', sessionId, groupId],
    queryFn: () => statsApi.getSessionSummary(sessionId, groupId).then((res) => res.data),
    enabled: !!sessionId && !!groupId,
  });
};

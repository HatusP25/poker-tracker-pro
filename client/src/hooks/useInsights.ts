import { useQuery } from '@tanstack/react-query';
import { insightsApi } from '@/lib/api';

export const useRecords = (groupId: string) =>
  useQuery({
    queryKey: ['insights', 'records', groupId],
    queryFn: async () => (await insightsApi.getRecords(groupId)).data,
    enabled: !!groupId,
  });

export const useHeadToHead = (groupId: string, playerA?: string, playerB?: string) =>
  useQuery({
    queryKey: ['insights', 'h2h', groupId, playerA, playerB],
    queryFn: async () => (await insightsApi.getHeadToHead(groupId, playerA, playerB)).data,
    enabled: !!groupId,
  });

export const useForm = (groupId: string) =>
  useQuery({
    queryKey: ['insights', 'form', groupId],
    queryFn: async () => (await insightsApi.getForm(groupId)).data,
    enabled: !!groupId,
  });

export const useSeasonRecap = (groupId: string, year: number) =>
  useQuery({
    queryKey: ['insights', 'season', groupId, year],
    queryFn: async () => (await insightsApi.getSeasonRecap(groupId, year)).data,
    enabled: !!groupId,
  });

/** Recap for a group-defined season rather than a calendar year. */
export const useSeasonRecapForSeason = (groupId: string, seasonId: string | null) =>
  useQuery({
    queryKey: ['insights', 'season', groupId, 'season', seasonId],
    queryFn: async () =>
      (await insightsApi.getSeasonRecapForSeason(groupId, seasonId!)).data,
    enabled: !!groupId && !!seasonId,
  });

export const useBelt = (groupId: string) =>
  useQuery({
    queryKey: ['insights', 'belt', groupId],
    queryFn: async () => (await insightsApi.getBelt(groupId)).data,
    enabled: !!groupId,
  });

export const useAchievements = (groupId: string) =>
  useQuery({
    queryKey: ['insights', 'achievements', groupId],
    queryFn: async () => (await insightsApi.getAchievements(groupId)).data,
    enabled: !!groupId,
  });

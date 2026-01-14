import axios from 'axios';
import type { Group, Player, Session, PlayerStats, LeaderboardEntry, DashboardStats } from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Groups
export const groupsApi = {
  getAll: () => api.get<Group[]>('/groups'),
  getById: (id: string) => api.get<Group>(`/groups/${id}`),
  create: (data: { name: string; defaultBuyIn?: number; currency?: string }) =>
    api.post<Group>('/groups', data),
  update: (id: string, data: { name?: string; defaultBuyIn?: number; currency?: string }) =>
    api.patch<Group>(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
};

// Players
export const playersApi = {
  getByGroup: (groupId: string, activeOnly?: boolean) =>
    api.get<Player[]>(`/players/groups/${groupId}/players`, {
      params: { activeOnly },
    }),
  getById: (id: string) => api.get<Player>(`/players/${id}`),
  create: (data: { groupId: string; name: string; avatarUrl?: string }) =>
    api.post<Player>('/players', data),
  update: (id: string, data: { name?: string; avatarUrl?: string; isActive?: boolean }) =>
    api.patch<Player>(`/players/${id}`, data),
  toggleActive: (id: string) => api.patch<Player>(`/players/${id}/toggle-active`),
  delete: (id: string) => api.delete(`/players/${id}`),
  search: (groupId: string, query: string) =>
    api.get<Player[]>(`/players/groups/${groupId}/players/search`, {
      params: { q: query },
    }),
};

// Sessions
export const sessionsApi = {
  getByGroup: (groupId: string, limit?: number, includeDeleted?: boolean) =>
    api.get<Session[]>(`/sessions/groups/${groupId}/sessions`, {
      params: { limit, includeDeleted },
    }),
  getById: (id: string) => api.get<Session>(`/sessions/${id}`),
  create: (data: {
    groupId: string;
    date: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    notes?: string;
    photoUrls?: string[];
    entries: Array<{ playerId: string; buyIn: number; cashOut: number }>;
  }) => api.post<Session>('/sessions', data),
  update: (
    id: string,
    data: {
      date?: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      notes?: string;
      photoUrls?: string[];
    }
  ) => api.patch<Session>(`/sessions/${id}`, data),
  delete: (id: string) => api.delete(`/sessions/${id}`),
  restore: (id: string) => api.patch<Session>(`/sessions/${id}/restore`),
  addEntry: (
    sessionId: string,
    data: { playerId: string; buyIn: number; cashOut: number }
  ) => api.post(`/sessions/${sessionId}/entries`, data),
  updateEntry: (entryId: string, data: { buyIn?: number; cashOut?: number }) =>
    api.patch(`/sessions/entries/${entryId}`, data),
  deleteEntry: (entryId: string) => api.delete(`/sessions/entries/${entryId}`),
};

// Stats
export const statsApi = {
  getPlayerStats: (playerId: string) => api.get<PlayerStats>(`/stats/players/${playerId}/stats`),
  getLeaderboard: (groupId: string, minGames?: number) =>
    api.get<LeaderboardEntry[]>(`/stats/groups/${groupId}/leaderboard`, {
      params: { minGames },
    }),
  getDashboard: (groupId: string) =>
    api.get<DashboardStats>(`/stats/groups/${groupId}/dashboard`),
  getSessionStats: (sessionId: string) => api.get(`/stats/sessions/${sessionId}/stats`),
  checkBalance: (sessionId: string, threshold?: number) =>
    api.get(`/stats/sessions/${sessionId}/balance-check`, {
      params: { threshold },
    }),
};

// Backup
export const backupApi = {
  export: () => api.get('/backup/export', { responseType: 'blob' }),
  validate: (backup: any) => api.post('/backup/validate', backup),
  import: (backup: any, options: { mode: 'merge' | 'replace'; skipDuplicates: boolean }) =>
    api.post('/backup/import', { backup, options }),
};

export default api;

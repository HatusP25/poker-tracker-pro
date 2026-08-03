import axios from 'axios';
import type { Group, Player, PlayerNote, Session, PlayerStats, LeaderboardEntry, LeaderboardTimeframe, DashboardStats, GroupRecords, HeadToHeadResponse, PlayerForm, SeasonRecap, BeltLineage, AchievementsResponse } from '@/types';

// Shared secret for mutating requests. Only present when the deployment sets one
// (see server/src/middleware/requireApiKey.ts); local dev leaves it undefined and
// the server gate is a no-op. This is a deployment gate, not user authentication —
// it stops anonymous internet traffic from reaching destructive endpoints.
const apiKey = import.meta.env.VITE_API_KEY as string | undefined;

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
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
  create: (data: { groupId: string; name: string; nickname?: string | null; avatarUrl?: string }) =>
    api.post<Player>('/players', data),
  update: (id: string, data: { name?: string; nickname?: string | null; avatarUrl?: string; isActive?: boolean }) =>
    api.patch<Player>(`/players/${id}`, data),
  toggleActive: (id: string) => api.patch<Player>(`/players/${id}/toggle-active`),
  delete: (id: string) => api.delete(`/players/${id}`),
  search: (groupId: string, query: string) =>
    api.get<Player[]>(`/players/groups/${groupId}/players/search`, {
      params: { q: query },
    }),
  getNotes: (playerId: string) => api.get<PlayerNote[]>(`/players/${playerId}/notes`),
  createNote: (playerId: string, data: { note: string; tags?: string[] }) =>
    api.post<PlayerNote>(`/players/${playerId}/notes`, data),
  updateNote: (noteId: string, data: { note?: string; tags?: string[] }) =>
    api.patch<PlayerNote>(`/players/notes/${noteId}`, data),
  deleteNote: (noteId: string) => api.delete(`/players/notes/${noteId}`),
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
  updateSettlementPaid: (sessionId: string, index: number, paid: boolean) =>
    api.patch<Session>(`/sessions/${sessionId}/settlements/${index}`, { paid }),
};

// Stats
export const statsApi = {
  getPlayerStats: (playerId: string) => api.get<PlayerStats>(`/stats/players/${playerId}/stats`),
  getLeaderboard: (groupId: string, minGames?: number, timeframe?: LeaderboardTimeframe) =>
    api.get<LeaderboardEntry[]>(`/stats/groups/${groupId}/leaderboard`, {
      params: { minGames, timeframe },
    }),
  getDashboard: (groupId: string) =>
    api.get<DashboardStats>(`/stats/groups/${groupId}/dashboard`),
  getSessionStats: (sessionId: string) => api.get(`/stats/sessions/${sessionId}/stats`),
  getPlayerStreaks: (groupId: string) =>
    api.get<{
      playerId: string;
      playerName: string;
      currentStreak: number;
      streakType: 'win' | 'loss' | 'none';
      longestWinStreak: number;
      longestLossStreak: number;
    }[]>(`/stats/groups/${groupId}/streaks`),
  getPlayerPerformanceTrend: (playerId: string) =>
    api.get<Array<{
      date: string;
      sessionProfit: number;
      cumulativeProfit: number;
    }>>(`/stats/players/${playerId}/performance-trend`),
  getSessionSummary: (sessionId: string, groupId: string) =>
    api.get(`/stats/sessions/${sessionId}/summary`, {
      params: { groupId },
    }),
};

// Insights
export const insightsApi = {
  getRecords: (groupId: string) =>
    api.get<GroupRecords>(`/stats/groups/${groupId}/records`),
  getHeadToHead: (groupId: string, playerA?: string, playerB?: string) =>
    api.get<HeadToHeadResponse>(`/stats/groups/${groupId}/head-to-head`, {
      params: { playerA, playerB },
    }),
  getForm: (groupId: string) =>
    api.get<PlayerForm[]>(`/stats/groups/${groupId}/form`),
  getSeasonRecap: (groupId: string, year: number) =>
    api.get<SeasonRecap>(`/stats/groups/${groupId}/season`, { params: { year } }),
  getBelt: (groupId: string) =>
    api.get<BeltLineage>(`/stats/groups/${groupId}/belt`),
  getAchievements: (groupId: string) =>
    api.get<AchievementsResponse>(`/stats/groups/${groupId}/achievements`),
};

// Backup
export const backupApi = {
  // Omit groupId to export every group. A group-scoped file is safer to restore:
  // a "replace" from it can only ever affect that one group.
  export: (groupId?: string) =>
    api.get(groupId ? `/backup/export/${groupId}` : '/backup/export'),
  validate: (backup: any) => api.post('/backup/validate', backup),
  import: (backup: any, options: { mode: 'merge' | 'replace'; skipDuplicates: boolean }) =>
    api.post('/backup/import', { backup, options }),
};

// Templates
export const templatesApi = {
  getByGroup: (groupId: string) => api.get(`/templates/groups/${groupId}/templates`),
  getById: (id: string) => api.get(`/templates/${id}`),
  create: (data: {
    groupId: string;
    name: string;
    location?: string;
    defaultTime?: string;
    playerIds: string[];
  }) => api.post('/templates', data),
  update: (
    id: string,
    data: {
      name?: string;
      location?: string;
      defaultTime?: string;
      playerIds?: string[];
    }
  ) => api.patch(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
};

// Live Sessions
export const liveSessionsApi = {
  start: (data: {
    groupId: string;
    date: string;
    startTime: string;
    location?: string;
    players: Array<{ playerId: string; buyIn: number }>;
  }) => api.post('/live-sessions/start', data),
  get: (sessionId: string) => api.get(`/live-sessions/${sessionId}`),
  addRebuy: (sessionId: string, data: { playerId: string; amount: number }) =>
    api.post(`/live-sessions/${sessionId}/rebuy`, data),
  updateRebuy: (sessionId: string, rebuyId: string, data: { amount: number }) =>
    api.patch(`/live-sessions/${sessionId}/rebuys/${rebuyId}`, data),
  deleteRebuy: (sessionId: string, rebuyId: string) =>
    api.delete(`/live-sessions/${sessionId}/rebuys/${rebuyId}`),
  addPlayer: (sessionId: string, data: { playerId: string; buyIn: number }) =>
    api.post(`/live-sessions/${sessionId}/add-player`, data),
  // Cash a player out mid-session because they're leaving; their result is locked
  // in from that moment and End Session stops asking for it.
  cashOut: (sessionId: string, data: { playerId: string; cashOut: number }) =>
    api.post(`/live-sessions/${sessionId}/cash-out`, data),
  undoCashOut: (sessionId: string, playerId: string) =>
    api.delete(`/live-sessions/${sessionId}/cash-out/${playerId}`),
  end: (sessionId: string, data: { endTime: string; cashOuts: Array<{ playerId: string; cashOut: number }> }) =>
    api.post(`/live-sessions/${sessionId}/end`, data),
  reopen: (sessionId: string) => api.post(`/live-sessions/${sessionId}/reopen`, {}),
  forceEnd: (sessionId: string, now: Date) => {
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return api.post(`/live-sessions/${sessionId}/force-end`, { endTime });
  },
  getActive: (groupId: string) => api.get(`/live-sessions/groups/${groupId}/active`),
};

export default api;

// Matches backend types
export interface Group {
  id: string;
  name: string;
  defaultBuyIn: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    players: number;
    sessions: number;
  };
}

export interface Player {
  id: string;
  groupId: string;
  name: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    entries: number;
  };
}

export interface Session {
  id: string;
  groupId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  photoUrls: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entries?: SessionEntry[];
}

export interface SessionEntry {
  id: string;
  sessionId: string;
  playerId: string;
  buyIn: number;
  cashOut: number;
  createdAt: string;
  updatedAt: string;
  player?: {
    id: string;
    name: string;
  };
  profit?: number;
  rebuys?: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  totalGames: number;
  totalBuyIn: number;
  totalCashOut: number;
  balance: number;
  roi: number;
  winRate: number;
  avgProfit: number;
  avgBuyIn: number;
  cashOutRate: number;
  recentFormWinRate: number;
  winningSessionsCount: number;
  losingSessionsCount: number;
  breakEvenSessionsCount: number;
  bestSession: number;
  worstSession: number;
  totalRebuys: number;
  rebuyRate: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  totalGames: number;
  totalBuyIn: number;
  totalCashOut: number;
  balance: number;
  roi: number;
  winRate: number;
  avgProfit: number;
  bestSession: number;
  recentFormWinRate: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  isActive: boolean;
}

export interface DashboardStats {
  totalSessions: number;
  totalPlayers: number;
  activePlayers: number;
  netGroupProfit: number;
  avgSessionSize: number;
  lastSessionDate: string | null;
  topPlayers: Array<{
    playerId: string;
    playerName: string;
    balance: number;
    roi: number;
    totalGames: number;
  }>;
  recentSessions: Array<{
    sessionId: string;
    date: string;
    playerCount: number;
    winner: string;
    totalPot: number;
  }>;
}

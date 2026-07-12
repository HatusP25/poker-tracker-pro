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

export interface PlayerNote {
  id: string;
  playerId: string;
  note: string;
  tags: string | null; // JSON array of tags
  createdAt: string;
  updatedAt: string;
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
  status?: string; // "IN_PROGRESS" | "COMPLETED"
  settlements?: string | null; // JSON string
  completedAt?: string | null; // When status transitioned to COMPLETED (distinct from updatedAt)
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entries?: SessionEntry[];
  rebuyEvents?: RebuyEvent[];
  group?: Group;
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

export interface RebuyEvent {
  id: string;
  sessionId: string;
  playerId: string;
  amount: number;
  createdAt: string;
  player: {
    id: string;
    name: string;
  };
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

export type LeaderboardTimeframe = 'all' | 'year' | 'month' | 'week';

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

export interface SessionTemplate {
  id: string;
  groupId: string;
  name: string;
  location: string | null;
  defaultTime: string | null;
  playerIds: string; // JSON string array
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  from: string; // Player name
  to: string; // Player name
  amount: number;
  paid?: boolean; // Per-session paid/pending status; absent/false = unpaid
}

// Session Summary Types
export interface SessionSummary {
  session: {
    id: string;
    date: string;
    playerCount: number;
    totalPot: number;
  };
  rankingChanges: RankingChange[];
  highlights: SessionHighlights;
  streaks: StreakUpdate[];
  milestones: Milestone[];
}

export interface RankingChange {
  playerId: string;
  playerName: string;
  oldRank: number;
  newRank: number;
  change: number; // positive = moved up, negative = moved down
  profit: number;
}

export interface SessionHighlights {
  biggestWinner: { playerId: string; name: string; profit: number };
  biggestLoser: { playerId: string; name: string; profit: number };
  mostRebuys?: { playerId: string; name: string; rebuys: number };
  biggestComeback?: { playerId: string; name: string; description: string };
}

export interface StreakUpdate {
  playerId: string;
  playerName: string;
  type: 'win' | 'loss';
  count: number;
  isNew: boolean; // true if this is a new streak, false if extended
}

export interface Milestone {
  playerId: string;
  playerName: string;
  type: 'best_session' | 'total_games' | 'total_profit' | 'top_3';
  description: string;
  value?: number;
}

// ---- Insights ----
export interface RecordEntry {
  playerId: string;
  playerName: string;
  sessionId: string;
  date: string;
  value: number;
}
export interface StreakRecord {
  playerId: string;
  playerName: string;
  count: number;
}
export interface PotRecord {
  sessionId: string;
  date: string;
  total: number;
}
export interface GroupRecords {
  biggestWin: RecordEntry | null;
  biggestLoss: RecordEntry | null;
  biggestComeback: RecordEntry | null;
  longestWinStreak: StreakRecord | null;
  longestLossStreak: StreakRecord | null;
  mostRebuys: RecordEntry | null;
  bestRoiNight: RecordEntry | null;
  biggestPot: PotRecord | null;
}
export interface PairStats {
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  sharedSessions: number;
  aWins: number;
  bWins: number;
  ties: number;
  profitDifferential: number;
  currentStreakHolder: string | null;
  currentStreakCount: number;
}
export interface PlayerRivalryInsight {
  playerId: string;
  playerName: string;
  bogey: { playerId: string; playerName: string; lossesTo: number } | null;
  favoriteVictim: { playerId: string; playerName: string; winsOver: number } | null;
}
export interface HeadToHeadResponse {
  pair: PairStats | null;
  biggestRivalry: PairStats | null;
  playerInsights: PlayerRivalryInsight[];
}
export interface PlayerForm {
  playerId: string;
  playerName: string;
  recentResults: number[];
  recentWins: number;
  recentGames: number;
  trajectory: 'up' | 'down' | 'flat';
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
  badge: 'heater' | 'slump' | null;
}
export interface SeasonSuperlative {
  playerId: string;
  playerName: string;
  value: number;
}
export interface SeasonRecap {
  period: string;
  totalSessions: number;
  totalPot: number;
  champion: SeasonSuperlative | null;
  attendanceKing: SeasonSuperlative | null;
  biggestMover: { playerId: string; playerName: string; positionsGained: number } | null;
  bestSingleNight: RecordEntry | null;
  mostRebuys: SeasonSuperlative | null;
}

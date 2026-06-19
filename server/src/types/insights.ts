// ---- Module 1: Records ----
export interface RecordEntry {
  playerId: string;
  playerName: string;
  sessionId: string;
  date: string; // ISO string
  value: number; // profit, rebuys, or roi% depending on record
}

export interface StreakRecord {
  playerId: string;
  playerName: string;
  count: number;
}

export interface PotRecord {
  sessionId: string;
  date: string; // ISO string
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

// ---- Module 2: Head-to-Head ----
export interface PairStats {
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  sharedSessions: number;
  aWins: number; // sessions A finished higher (more profit)
  bWins: number;
  ties: number;
  profitDifferential: number; // sum(A.profit - B.profit), rounded
  currentStreakHolder: string | null; // playerName currently leading the H2H streak
  currentStreakCount: number;
}

export interface PlayerRivalryInsight {
  playerId: string;
  playerName: string;
  bogey: { playerId: string; playerName: string; lossesTo: number } | null;
  favoriteVictim: { playerId: string; playerName: string; winsOver: number } | null;
}

export interface HeadToHeadResponse {
  pair: PairStats | null; // null unless both playerA & playerB requested and share >=1 session
  biggestRivalry: PairStats | null; // most shared sessions across the group
  playerInsights: PlayerRivalryInsight[];
}

// ---- Module 3: Form & Momentum ----
export interface PlayerForm {
  playerId: string;
  playerName: string;
  recentResults: number[]; // last RECENT_WINDOW profits, oldest -> newest
  recentWins: number;
  recentGames: number;
  trajectory: 'up' | 'down' | 'flat';
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
  badge: 'heater' | 'slump' | null;
}

// ---- Module 4: Season Recap ----
export interface SeasonSuperlative {
  playerId: string;
  playerName: string;
  value: number;
}

export interface SeasonRecap {
  period: string; // e.g. "2026"
  totalSessions: number;
  totalPot: number;
  champion: SeasonSuperlative | null; // highest total profit
  attendanceKing: SeasonSuperlative | null; // most sessions played
  biggestMover: { playerId: string; playerName: string; positionsGained: number } | null;
  bestSingleNight: RecordEntry | null;
  mostRebuys: SeasonSuperlative | null;
}

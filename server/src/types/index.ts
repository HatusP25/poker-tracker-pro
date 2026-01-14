// Core calculation types
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
  avgBuyIn: number; // NEW: Average buy-in per game
  cashOutRate: number; // NEW: Percentage of buy-in recovered
  recentFormWinRate: number; // NEW: Win rate of last 5 games
  winningSessionsCount: number;
  losingSessionsCount: number;
  breakEvenSessionsCount: number;
  bestSession: number;
  worstSession: number;
  totalRebuys: number;
  rebuyRate: number; // NEW: Rebuys per game as percentage
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
  bestSession: number; // NEW: Show biggest win on leaderboard
  recentFormWinRate: number; // NEW: Last 5 games win rate
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  isActive: boolean;
}

export interface SessionStats {
  sessionId: string;
  date: Date;
  playerCount: number;
  totalBuyIn: number;
  totalCashOut: number;
  balance: number;
  isBalanced: boolean;
  biggestWinner: {
    playerId: string;
    playerName: string;
    profit: number;
  } | null;
  biggestLoser: {
    playerId: string;
    playerName: string;
    profit: number;
  } | null;
}

export interface DashboardStats {
  totalSessions: number;
  totalPlayers: number;
  activePlayers: number;
  netGroupProfit: number; // CHANGED: From totalMoneyInPlay to actual group profit
  avgSessionSize: number; // NEW: Average pot size per session
  lastSessionDate: Date | null;
  topPlayers: Array<{
    playerId: string;
    playerName: string;
    balance: number;
    roi: number;
    totalGames: number;
  }>;
  recentSessions: Array<{
    sessionId: string;
    date: Date;
    playerCount: number;
    winner: string;
    totalPot: number;
  }>;
}

export interface SessionEntryWithProfit {
  id: string;
  sessionId: string;
  playerId: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
  profit: number;
  rebuys: number;
}

export interface StreakInfo {
  current: { type: 'win' | 'loss' | 'none'; count: number };
  longestWin: number;
  longestLoss: number;
  streakHistory: Array<{
    type: 'win' | 'loss';
    count: number;
    startDate: Date;
    endDate: Date;
  }>;
}

export interface BalanceCheck {
  sessionId: string;
  totalBuyIn: number;
  totalCashOut: number;
  difference: number;
  isBalanced: boolean;
  threshold: number;
}

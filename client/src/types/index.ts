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
  /** Optional handle shown on personality surfaces; see lib/displayName.ts. */
  nickname?: string | null;
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
  /** Set when the player left an in-progress session early; null = still at the table. */
  cashedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
  player?: {
    id: string;
    name: string;
    nickname?: string | null;
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
  titles: NightTitle[];
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

// ---- Banter Pack ----
export type NightTitleId = 'shark' | 'donation' | 'atm' | 'houdini';
export interface NightTitle {
  id: NightTitleId;
  label: string;
  emoji: string;
  playerId: string;
  playerName: string;
}

export interface BeltReign {
  playerId: string;
  playerName: string;
  fromDate: string; // ISO date of the session where the reign began
  toDate: string | null; // ISO date reign ended (session lost), null = current
  nightsHeld: number; // completed sessions from reign start through reign end (inclusive) in which the belt existed
  defenses: number; // nights the holder played and retained
  takenFromPlayerName: string | null; // null for the first champion
}
export interface BeltLineage {
  current: BeltReign | null;
  history: BeltReign[];
  totalTitleChanges: number;
}

export type AchievementId =
  | 'hat-trick' | 'comeback-kid' | 'phoenix' | 'giant-slayer' | 'iron-man'
  | 'regular' | 'veteran' | 'rebuy-royalty' | 'double-up' | 'untouchable';
export interface EarnedAchievement {
  id: AchievementId;
  name: string;
  emoji: string;
  description: string;
  earnedAt: string;
  sessionId: string;
}
export interface PlayerAchievements {
  playerId: string;
  playerName: string;
  earned: EarnedAchievement[];
}
export interface AchievementsResponse {
  players: PlayerAchievements[];
  recentUnlocks: (EarnedAchievement & { playerId: string; playerName: string })[]; // newest first, cap 10
  catalog: { id: AchievementId; name: string; emoji: string; description: string }[]; // all 10, for greyed silhouettes
}

export interface Season {
  id: string;
  groupId: string;
  name: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Angles ----
// Mirrors server/src/types/angles.ts EXACTLY. Derived on read from existing rows;
// no grinder/bankroll metrics anywhere in this contract (DECISIONS D-002).

export type SplitDimension = 'dayOfWeek' | 'venue' | 'tableSize';

export interface SplitBucket {
  key: string; // 'FRI', a lowercased venue, '6'
  label: string; // 'Friday', "Sam's place", '6-handed'
  sessions: number;
  totalProfit: number;
  avgProfit: number;
  totalBuyIn: number;
  avgBuyIn: number;
  wins: number;
  winRate: number;
}

export interface SplitSummary {
  dimension: SplitDimension;
  buckets: SplitBucket[]; // best average first; venue capped at the busiest 10
  best: SplitBucket | null; // null unless >= 2 buckets clear minSessions
  worst: SplitBucket | null;
  minSessions: number;
  totalSessions: number;
}

export interface PlayerSplits {
  dayOfWeek: SplitSummary;
  venue: SplitSummary;
  tableSize: SplitSummary;
}

export interface AttendanceSummary {
  played: number;
  eligible: number; // group nights since this player's first appearance
  attendanceRate: number;
  currentStreak: number;
  longestStreak: number;
  missedInARow: number;
  firstPlayedDate: string | null;
  lastPlayedDate: string | null;
}

export interface DroughtSummary {
  hasEverWon: boolean;
  nightsSinceLastWin: number | null; // null when they have never won
  lastWinDate: string | null;
  lastWinSessionId: string | null;
  longestDrought: number;
}

export interface RebuySummary {
  totalAmount: number;
  count: number;
  avgPerNight: number;
  biggestNight: {
    sessionId: string;
    date: string;
    amount: number;
    count: number;
  } | null;
}

export interface DepartureSummary {
  trackedSessions: number; // nights where anyone's exit time was recorded at all
  earlyExits: number;
  avgProfitWhenEarly: number | null;
  avgProfitWhenStayed: number | null;
  meaningful: boolean; // false => say "we can't tell", don't render a number
}

export interface RankedNight {
  sessionId: string;
  date: string;
  profit: number;
  rank: number; // 1 = best night of this player's career
  outOf: number;
}

export interface CoAttendancePair {
  playerAId: string;
  playerAName: string;
  playerBId: string;
  playerBName: string;
  sharedSessions: number;
}

export interface RivalrySummary {
  playerId: string;
  playerName: string;
  wins: number; // nights the subject finished ahead
  losses: number;
  ties: number;
  sharedSessions: number;
  dominance: number; // larger of wins/losses as a % of shared nights
}

export interface PlayerRivalries {
  nemesis: RivalrySummary | null;
  favouriteVictim: RivalrySummary | null;
  mostPlayedWith: CoAttendancePair | null;
}

export type StoryAngleId =
  | 'nemesis'
  | 'favourite-victim'
  | 'attendance-streak'
  | 'attendance-rate'
  | 'gone-missing'
  | 'drought'
  | 'never-won'
  | 'best-day'
  | 'worst-day'
  | 'best-venue'
  | 'worst-venue'
  | 'best-table-size'
  | 'worst-table-size'
  | 'rebuy-dollars'
  | 'played-together'
  | 'career-night'
  | 'night-rank'
  | 'heater'
  | 'slump'
  | 'early-exit'
  | 'career-balance'
  | 'newcomer'
  | 'never-played';

export type AngleTone = 'brag' | 'burn' | 'neutral';

export type AngleFamily =
  | 'rivalry'
  | 'attendance'
  | 'drought'
  | 'split'
  | 'rebuys'
  | 'nights'
  | 'form'
  | 'social'
  | 'career';

export type AngleUnit = 'currency' | 'count' | 'percent' | 'nights' | 'rank';

/** Structured facts for one sentence about one player. The client writes the words. */
export interface StoryAngle {
  id: StoryAngleId;
  family: AngleFamily;
  tone: AngleTone;
  score: number; // 1-100
  value: number;
  unit: AngleUnit;
  comparisonValue: number | null;
  label: string | null;
  subject: { playerId: string; playerName: string } | null;
  sessionId: string | null;
  date: string | null;
  sampleSize: number;
  fallback: boolean; // generic last-resort angle, not earned
}

export interface PlayerAngles {
  playerId: string;
  playerName: string;
  isActive: boolean;
  games: number;
  balance: number;
  attendance: AttendanceSummary;
  drought: DroughtSummary;
  splits: PlayerSplits;
  rebuys: RebuySummary;
  departures: DepartureSummary;
  bestNights: RankedNight[]; // top 3, best first
  latestNight: RankedNight | null;
  rivalries: PlayerRivalries;
  angles: StoryAngle[]; // best first, at most 5, one per family, never empty
}

export interface AngleThresholds {
  splitMinSessions: number;
  rivalryMinSessions: number;
  attendanceMinSessions: number;
  droughtMinNights: number;
  departureMinTracked: number;
  coAttendanceMinSessions: number;
  streakBadgeMinNights: number;
  maxAnglesPerPlayer: number;
}

export interface GroupAnglesResponse {
  groupId: string;
  totalSessions: number; // completed, non-deleted
  firstSessionDate: string | null;
  lastSessionDate: string | null;
  splits: PlayerSplits; // the same three splits across the whole group
  players: PlayerAngles[]; // one per group member, including those who never played
  coAttendance: CoAttendancePair[]; // every pair with >= 1 shared night, most first
  thresholds: AngleThresholds;
}

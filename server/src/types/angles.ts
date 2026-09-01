// Angles — the derived-on-read metrics behind "every player has a story".
// Mirrored EXACTLY in client/src/types/index.ts (CLAUDE.md §6).
//
// Everything here is computed from rows the app already stores (Session,
// SessionEntry, RebuyEvent, Player). No schema change, no persisted state
// (DECISIONS D-004), and deliberately no grinder/bankroll metric (D-002): there is
// no $/hour, no variance, no std-dev and no EV anywhere in this contract.

// ---- Splits ----

export type SplitDimension = 'dayOfWeek' | 'venue' | 'tableSize';

/** One slice of nights — a weekday, a venue, a table size. */
export interface SplitBucket {
  /** Stable machine key: 'FRI', a lowercased venue, '6'. */
  key: string;
  /** Display label: 'Friday', "Sam's place", '6-handed'. */
  label: string;
  sessions: number;
  totalProfit: number;
  avgProfit: number;
  /** Money staked in this bucket — the group-level view, where profit nets to ~0. */
  totalBuyIn: number;
  avgBuyIn: number;
  wins: number;
  /** Winning nights as a percentage of nights in this bucket. */
  winRate: number;
}

export interface SplitSummary {
  dimension: SplitDimension;
  /** Every bucket seen, best average first. Venue is capped at the busiest 10. */
  buckets: SplitBucket[];
  /**
   * Best/worst are null unless at least two buckets clear `minSessions` — with one
   * qualifying bucket there is no comparison to make, only noise.
   */
  best: SplitBucket | null;
  worst: SplitBucket | null;
  minSessions: number;
  /** Nights behind this split (the subject's, or the group's). */
  totalSessions: number;
}

export interface PlayerSplits {
  dayOfWeek: SplitSummary;
  venue: SplitSummary;
  tableSize: SplitSummary;
}

// ---- Attendance ----

export interface AttendanceSummary {
  played: number;
  /** Group nights from this player's first appearance onward — what they could have shown up to. */
  eligible: number;
  /** played / eligible as a percentage; 0 when they have never played. */
  attendanceRate: number;
  /** Consecutive most-recent group nights attended (0 if they missed the last one). */
  currentStreak: number;
  longestStreak: number;
  /** Consecutive most-recent group nights missed (0 if they were at the last one). */
  missedInARow: number;
  firstPlayedDate: string | null;
  lastPlayedDate: string | null;
}

// ---- Drought ----

export interface DroughtSummary {
  hasEverWon: boolean;
  /** Nights *they played* since their last winning night; null when they never have. */
  nightsSinceLastWin: number | null;
  lastWinDate: string | null;
  lastWinSessionId: string | null;
  /** Longest run of their own nights without a win. */
  longestDrought: number;
}

// ---- Rebuy dollars ----

export interface RebuySummary {
  /** Sum of RebuyEvent.amount — recorded events, or reconstructed for nights with none. */
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

// ---- Early departures ----

export interface DepartureSummary {
  /**
   * Nights in this player's history where someone's exit time was recorded at all.
   * Only a live-tracked night can express "left early", so everything below is
   * reported against this denominator rather than their whole career.
   */
  trackedSessions: number;
  earlyExits: number;
  avgProfitWhenEarly: number | null;
  avgProfitWhenStayed: number | null;
  /** False when the group never tracked exits — then the honest answer is "we can't tell". */
  meaningful: boolean;
}

// ---- Night ranking ----

export interface RankedNight {
  sessionId: string;
  date: string;
  profit: number;
  /** 1 = the best night of this player's career. */
  rank: number;
  outOf: number;
}

// ---- Rivalries & co-attendance ----

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
  /** Nights the subject finished ahead of this opponent. */
  wins: number;
  /** Nights this opponent finished ahead of the subject. */
  losses: number;
  ties: number;
  sharedSessions: number;
  /** The larger of wins/losses as a percentage of shared nights. */
  dominance: number;
}

export interface PlayerRivalries {
  /** The opponent who beats this player most often, once the sample is big enough. */
  nemesis: RivalrySummary | null;
  favouriteVictim: RivalrySummary | null;
  mostPlayedWith: CoAttendancePair | null;
}

// ---- Story angles ----

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

/** Angles are deduplicated to one per family, so the top few never say the same thing twice. */
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

/**
 * One true, specific thing about one player — as structured data. The client owns
 * every word of the sentence; this carries only the numbers and references it needs.
 */
export interface StoryAngle {
  id: StoryAngleId;
  family: AngleFamily;
  tone: AngleTone;
  /** 1–100. Higher = more specific, more recent, better evidenced, more worth saying. */
  score: number;
  /** The headline magnitude; `unit` says how to render it. */
  value: number;
  unit: AngleUnit;
  /** The baseline the headline is measured against, when there is one. */
  comparisonValue: number | null;
  /** A weekday, venue or table size when the angle is about one. */
  label: string | null;
  /** The other player the angle is about. */
  subject: { playerId: string; playerName: string } | null;
  sessionId: string | null;
  date: string | null;
  /** Nights behind the claim, so the client can hedge honestly. */
  sampleSize: number;
  /** True for the guaranteed last-resort angle — generic, not earned. */
  fallback: boolean;
}

// ---- Response ----

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
  /** Their three biggest nights, best first. */
  bestNights: RankedNight[];
  /** Their most recent night, ranked within their own career. */
  latestNight: RankedNight | null;
  rivalries: PlayerRivalries;
  /** Best first, at most 5, one per family, never empty. */
  angles: StoryAngle[];
}

/** The minimum samples applied before a metric is allowed to make a claim. */
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
  /** Completed, non-deleted sessions only. */
  totalSessions: number;
  firstSessionDate: string | null;
  lastSessionDate: string | null;
  /** The same three splits computed across everyone — "we all lose at Sam's". */
  splits: PlayerSplits;
  /** One entry per group member, including members who have never played. */
  players: PlayerAngles[];
  /** Every pair that has shared at least one night, most shared first. */
  coAttendance: CoAttendancePair[];
  thresholds: AngleThresholds;
}

import { round } from '../utils/calculations';
import {
  AngleFamily,
  AngleThresholds,
  AngleTone,
  AngleUnit,
  AttendanceSummary,
  CoAttendancePair,
  DepartureSummary,
  DroughtSummary,
  GroupAnglesResponse,
  PlayerAngles,
  PlayerRivalries,
  PlayerSplits,
  RankedNight,
  RebuySummary,
  RivalrySummary,
  SplitBucket,
  SplitDimension,
  SplitSummary,
  StoryAngle,
  StoryAngleId,
} from '../types/angles';

/**
 * The angles engine — every metric the app could already derive but never did,
 * plus the selector that turns them into a story for each individual player.
 *
 * Everything here is pure: rows in, structured facts out. No database, no clock, no
 * prose. The client owns every word; this owns every number.
 *
 * Deliberately absent, per DECISIONS D-002: $/hour, variance, standard deviation,
 * EV. The one dispersion figure computed below (`typicalSwing`, a mean absolute
 * night profit) exists solely to normalise angle scores across players who play for
 * different stakes, and is never returned in a response.
 */

// ---- Thresholds --------------------------------------------------------------

/**
 * Minimum samples before a metric is allowed to make a claim. Below these, the
 * shape is still returned — well-formed and empty — rather than a noisy number
 * (the settled rule from the Insights design: never error, always return a
 * well-formed empty structure, tie-break deterministically, guard divisions).
 */
export const MAX_ANGLES_PER_PLAYER = 5;

export const ANGLE_THRESHOLDS: AngleThresholds = {
  splitMinSessions: 3,
  rivalryMinSessions: 4,
  attendanceMinSessions: 5,
  droughtMinNights: 3,
  departureMinTracked: 3,
  coAttendanceMinSessions: 3,
  streakBadgeMinNights: 3,
  maxAnglesPerPlayer: MAX_ANGLES_PER_PLAYER,
};

/** Venue is unbounded in the data, so its bucket list is capped for payload size. */
const MAX_VENUE_BUCKETS = 10;

// ---- Row shapes (already fetched, DB-agnostic) -------------------------------

export interface AngleEntryRow {
  playerId: string;
  playerName: string;
  buyIn: number;
  cashOut: number;
  /** `SessionEntry.cashedOutAt` was set — they left before the night ended. */
  cashedOutEarly: boolean;
}

export interface AngleRebuyRow {
  playerId: string;
  /** RebuyEvent.amount — recorded, or reconstructed for nights that recorded none. */
  amount: number;
}

export interface AngleSessionRow {
  id: string;
  date: string; // ISO string
  createdAt: string; // ISO string, tie-break for nights sharing a date
  location: string | null;
  entries: AngleEntryRow[];
  rebuyEvents: AngleRebuyRow[];
}

export interface AngleRosterRow {
  id: string;
  name: string;
  isActive: boolean;
}

export interface BucketKey {
  key: string;
  label: string;
}

/** One night, from one player's point of view, with its context attached. */
export interface SubjectNight {
  sessionId: string;
  date: string;
  profit: number;
  buyIn: number;
  rebuyCount: number;
  rebuyAmount: number;
  leftEarly: boolean;
  /** Someone's exit time was recorded that night, so "left early" is observable. */
  departuresTracked: boolean;
  day: BucketKey;
  venue: BucketKey;
  tableSize: BucketKey;
}

// ---- Bucket keys -------------------------------------------------------------

const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Session dates are UTC-anchored throughout this codebase (`new Date('2026-05-31')`
 * parses as UTC midnight). Reading the weekday with local `getDay()` lands a day
 * early anywhere west of UTC — the timezone bug F-11 hit twice.
 */
export function dayOfWeekBucket(isoDate: string): BucketKey {
  const index = new Date(isoDate).getUTCDay();
  return { key: DAY_KEYS[index], label: DAY_LABELS[index] };
}

/** Matches `client/src/lib/locationStats.ts`: trimmed, case-insensitive, null -> Unspecified. */
export function venueBucket(location: string | null | undefined): BucketKey {
  const raw = (location ?? '').trim();
  if (raw.length === 0) return { key: 'unspecified', label: 'Unspecified' };
  return { key: raw.toLowerCase(), label: raw };
}

export function tableSizeBucket(playerCount: number): BucketKey {
  return { key: String(playerCount), label: `${playerCount}-handed` };
}

// ---- Ordering & per-player nights -------------------------------------------

/** Oldest -> newest; nights sharing a date fall back to createdAt, then id. */
export function orderSessions(sessions: AngleSessionRow[]): AngleSessionRow[] {
  return [...sessions].sort(
    (a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime() ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      a.id.localeCompare(b.id)
  );
}

/** One pass over the history, producing every player's night list in order. */
export function buildNightsByPlayer(
  sessions: AngleSessionRow[]
): Map<string, SubjectNight[]> {
  const byPlayer = new Map<string, SubjectNight[]>();

  for (const s of orderSessions(sessions)) {
    const day = dayOfWeekBucket(s.date);
    const venue = venueBucket(s.location);
    const tableSize = tableSizeBucket(s.entries.length);
    const departuresTracked = s.entries.some((e) => e.cashedOutEarly);

    const rebuyCounts = new Map<string, number>();
    const rebuyAmounts = new Map<string, number>();
    for (const r of s.rebuyEvents) {
      rebuyCounts.set(r.playerId, (rebuyCounts.get(r.playerId) ?? 0) + 1);
      rebuyAmounts.set(r.playerId, (rebuyAmounts.get(r.playerId) ?? 0) + r.amount);
    }

    for (const e of s.entries) {
      const list = byPlayer.get(e.playerId) ?? [];
      list.push({
        sessionId: s.id,
        date: s.date,
        profit: round(e.cashOut - e.buyIn),
        buyIn: e.buyIn,
        rebuyCount: rebuyCounts.get(e.playerId) ?? 0,
        rebuyAmount: round(rebuyAmounts.get(e.playerId) ?? 0),
        leftEarly: e.cashedOutEarly,
        departuresTracked,
        day,
        venue,
        tableSize,
      });
      byPlayer.set(e.playerId, list);
    }
  }

  return byPlayer;
}

export function buildPlayerNights(
  sessions: AngleSessionRow[],
  playerId: string
): SubjectNight[] {
  return buildNightsByPlayer(sessions).get(playerId) ?? [];
}

// ---- Splits ------------------------------------------------------------------

const bucketPicker: Record<SplitDimension, (n: SubjectNight) => BucketKey> = {
  dayOfWeek: (n) => n.day,
  venue: (n) => n.venue,
  tableSize: (n) => n.tableSize,
};

export function computeSplit(
  nights: SubjectNight[],
  dimension: SplitDimension,
  minSessions = ANGLE_THRESHOLDS.splitMinSessions
): SplitSummary {
  const pick = bucketPicker[dimension];
  const acc = new Map<
    string,
    { label: string; sessions: number; totalProfit: number; totalBuyIn: number; wins: number }
  >();

  for (const n of nights) {
    const { key, label } = pick(n);
    // First-seen casing wins the label, so "Sam's" and "sam's" show up once.
    const bucket = acc.get(key) ?? { label, sessions: 0, totalProfit: 0, totalBuyIn: 0, wins: 0 };
    bucket.sessions += 1;
    bucket.totalProfit += n.profit;
    bucket.totalBuyIn += n.buyIn;
    if (n.profit > 0) bucket.wins += 1;
    acc.set(key, bucket);
  }

  let buckets: SplitBucket[] = [...acc.entries()].map(([key, b]) => ({
    key,
    label: b.label,
    sessions: b.sessions,
    totalProfit: round(b.totalProfit),
    avgProfit: round(b.totalProfit / b.sessions),
    totalBuyIn: round(b.totalBuyIn),
    avgBuyIn: round(b.totalBuyIn / b.sessions),
    wins: b.wins,
    winRate: round((b.wins / b.sessions) * 100),
  }));

  if (dimension === 'venue' && buckets.length > MAX_VENUE_BUCKETS) {
    buckets = [...buckets]
      .sort((a, b) => b.sessions - a.sessions || a.key.localeCompare(b.key))
      .slice(0, MAX_VENUE_BUCKETS);
  }

  buckets.sort((a, b) => b.avgProfit - a.avgProfit || a.key.localeCompare(b.key));

  // With one qualifying bucket there is no comparison to make, only noise.
  const qualifying = buckets.filter((b) => b.sessions >= minSessions);
  const comparable = qualifying.length >= 2;

  return {
    dimension,
    buckets,
    best: comparable ? qualifying[0] : null,
    worst: comparable ? qualifying[qualifying.length - 1] : null,
    minSessions,
    totalSessions: nights.length,
  };
}

export function computeSplits(
  nights: SubjectNight[],
  minSessions = ANGLE_THRESHOLDS.splitMinSessions
): PlayerSplits {
  return {
    dayOfWeek: computeSplit(nights, 'dayOfWeek', minSessions),
    venue: computeSplit(nights, 'venue', minSessions),
    tableSize: computeSplit(nights, 'tableSize', minSessions),
  };
}

// ---- Attendance --------------------------------------------------------------

/**
 * Attendance measured from a player's first appearance onward, so a newcomer is
 * never punished for the years before they joined. This generalises the
 * `ironManStreak` bookkeeping that was buried inside `computeAchievements`.
 */
export function computeAttendance(
  sessions: AngleSessionRow[],
  playerId: string
): AttendanceSummary {
  const ordered = orderSessions(sessions);
  const attended = ordered.map((s) => s.entries.some((e) => e.playerId === playerId));
  const firstIndex = attended.indexOf(true);

  if (firstIndex === -1) {
    return {
      played: 0,
      eligible: 0,
      attendanceRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      missedInARow: 0,
      firstPlayedDate: null,
      lastPlayedDate: null,
    };
  }

  const window = attended.slice(firstIndex);
  const played = window.filter(Boolean).length;

  let longestStreak = 0;
  let run = 0;
  for (const present of window) {
    run = present ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }

  let currentStreak = 0;
  for (let i = window.length - 1; i >= 0 && window[i]; i--) currentStreak++;

  let missedInARow = 0;
  for (let i = window.length - 1; i >= 0 && !window[i]; i--) missedInARow++;

  const lastIndex = firstIndex + window.lastIndexOf(true);

  return {
    played,
    eligible: window.length,
    attendanceRate: round((played / window.length) * 100),
    currentStreak,
    longestStreak,
    missedInARow,
    firstPlayedDate: ordered[firstIndex].date,
    lastPlayedDate: ordered[lastIndex].date,
  };
}

// ---- Drought -----------------------------------------------------------------

export function computeDrought(nights: SubjectNight[]): DroughtSummary {
  let lastWin: SubjectNight | null = null;
  let lastWinIndex = -1;
  let longestDrought = 0;
  let run = 0;

  for (let i = 0; i < nights.length; i++) {
    if (nights[i].profit > 0) {
      lastWin = nights[i];
      lastWinIndex = i;
      run = 0;
    } else {
      run += 1;
      longestDrought = Math.max(longestDrought, run);
    }
  }

  return {
    hasEverWon: lastWin !== null,
    nightsSinceLastWin: lastWin === null ? null : nights.length - 1 - lastWinIndex,
    lastWinDate: lastWin === null ? null : lastWin.date,
    lastWinSessionId: lastWin === null ? null : lastWin.sessionId,
    longestDrought,
  };
}

// ---- Rebuy dollars -----------------------------------------------------------

export function computeRebuySummary(nights: SubjectNight[]): RebuySummary {
  const totalAmount = nights.reduce((sum, n) => sum + n.rebuyAmount, 0);
  const count = nights.reduce((sum, n) => sum + n.rebuyCount, 0);

  let biggest: SubjectNight | null = null;
  for (const n of nights) {
    if (n.rebuyAmount > 0 && (biggest === null || n.rebuyAmount > biggest.rebuyAmount)) {
      biggest = n;
    }
  }

  return {
    totalAmount: round(totalAmount),
    count,
    avgPerNight: round(nights.length > 0 ? totalAmount / nights.length : 0),
    biggestNight: biggest
      ? {
          sessionId: biggest.sessionId,
          date: biggest.date,
          amount: round(biggest.rebuyAmount),
          count: biggest.rebuyCount,
        }
      : null,
  };
}

// ---- Early departures --------------------------------------------------------

export function computeDepartures(
  nights: SubjectNight[],
  minTracked = ANGLE_THRESHOLDS.departureMinTracked
): DepartureSummary {
  const tracked = nights.filter((n) => n.departuresTracked);
  const early = tracked.filter((n) => n.leftEarly);
  const stayed = tracked.filter((n) => !n.leftEarly);
  const avg = (rows: SubjectNight[]) =>
    rows.length > 0 ? round(rows.reduce((s, n) => s + n.profit, 0) / rows.length) : null;

  return {
    trackedSessions: tracked.length,
    earlyExits: early.length,
    avgProfitWhenEarly: avg(early),
    avgProfitWhenStayed: avg(stayed),
    meaningful: tracked.length >= minTracked,
  };
}

// ---- Night ranking -----------------------------------------------------------

/** Where each of a player's nights ranks in their own career. Ties go to the earlier night. */
export function rankNights(nights: SubjectNight[]): RankedNight[] {
  return [...nights]
    .sort(
      (a, b) =>
        b.profit - a.profit ||
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        a.sessionId.localeCompare(b.sessionId)
    )
    .map((n, i) => ({
      sessionId: n.sessionId,
      date: n.date,
      profit: n.profit,
      rank: i + 1,
      outOf: nights.length,
    }));
}

// ---- Co-attendance & rivalries ----------------------------------------------

interface PairRecord {
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  shared: number;
  aWins: number;
  bWins: number;
  ties: number;
}

/**
 * Every pair's shared-night count and head-to-head record, in one pass.
 *
 * `insightsService.computeHeadToHead` builds the same numbers by re-scanning the
 * whole history once per pair, and then returns only the single biggest rivalry —
 * the rest is discarded. This keeps it.
 */
export function buildPairIndex(sessions: AngleSessionRow[]): Map<string, PairRecord> {
  const pairs = new Map<string, PairRecord>();

  for (const s of sessions) {
    const entries = s.entries;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [x, y] =
          entries[i].playerId < entries[j].playerId
            ? [entries[i], entries[j]]
            : [entries[j], entries[i]];
        const key = `${x.playerId}|${y.playerId}`;
        const rec =
          pairs.get(key) ??
          {
            aId: x.playerId,
            aName: x.playerName,
            bId: y.playerId,
            bName: y.playerName,
            shared: 0,
            aWins: 0,
            bWins: 0,
            ties: 0,
          };
        rec.aName = x.playerName;
        rec.bName = y.playerName;
        rec.shared += 1;
        const xProfit = x.cashOut - x.buyIn;
        const yProfit = y.cashOut - y.buyIn;
        if (xProfit > yProfit) rec.aWins += 1;
        else if (yProfit > xProfit) rec.bWins += 1;
        else rec.ties += 1;
        pairs.set(key, rec);
      }
    }
  }

  return pairs;
}

export function coAttendanceFromIndex(pairs: Map<string, PairRecord>): CoAttendancePair[] {
  return [...pairs.values()]
    .map((p) => ({
      playerAId: p.aId,
      playerAName: p.aName,
      playerBId: p.bId,
      playerBName: p.bName,
      sharedSessions: p.shared,
    }))
    .sort(
      (a, b) =>
        b.sharedSessions - a.sharedSessions ||
        a.playerAName.localeCompare(b.playerAName) ||
        a.playerBName.localeCompare(b.playerBName)
    );
}

export function computeCoAttendance(sessions: AngleSessionRow[]): CoAttendancePair[] {
  return coAttendanceFromIndex(buildPairIndex(sessions));
}

export function rivalriesFromIndex(
  pairs: Map<string, PairRecord>,
  playerId: string,
  thresholds: AngleThresholds = ANGLE_THRESHOLDS
): PlayerRivalries {
  const mine: RivalrySummary[] = [];
  let mostPlayedWith: CoAttendancePair | null = null;

  for (const p of pairs.values()) {
    if (p.aId !== playerId && p.bId !== playerId) continue;
    const isA = p.aId === playerId;
    const opponentId = isA ? p.bId : p.aId;
    const opponentName = isA ? p.bName : p.aName;
    const wins = isA ? p.aWins : p.bWins;
    const losses = isA ? p.bWins : p.aWins;

    mine.push({
      playerId: opponentId,
      playerName: opponentName,
      wins,
      losses,
      ties: p.ties,
      sharedSessions: p.shared,
      dominance: round((Math.max(wins, losses) / p.shared) * 100),
    });

    if (
      p.shared >= thresholds.coAttendanceMinSessions &&
      (mostPlayedWith === null || p.shared > mostPlayedWith.sharedSessions)
    ) {
      mostPlayedWith = {
        playerAId: playerId,
        playerAName: isA ? p.aName : p.bName,
        playerBId: opponentId,
        playerBName: opponentName,
        sharedSessions: p.shared,
      };
    }
  }

  const eligible = mine.filter((r) => r.sharedSessions >= thresholds.rivalryMinSessions);

  const pickBy = (rate: (r: RivalrySummary) => number, count: (r: RivalrySummary) => number) =>
    eligible.reduce<RivalrySummary | null>((best, r) => {
      if (count(r) <= r.sharedSessions - count(r)) return best; // must actually lead the pairing
      if (best === null) return r;
      const better =
        rate(r) - rate(best) ||
        count(r) - count(best) ||
        best.playerName.localeCompare(r.playerName);
      return better > 0 ? r : best;
    }, null);

  return {
    nemesis: pickBy((r) => r.losses / r.sharedSessions, (r) => r.losses),
    favouriteVictim: pickBy((r) => r.wins / r.sharedSessions, (r) => r.wins),
    mostPlayedWith,
  };
}

export function computeRivalries(
  sessions: AngleSessionRow[],
  playerId: string,
  thresholds: AngleThresholds = ANGLE_THRESHOLDS
): PlayerRivalries {
  return rivalriesFromIndex(buildPairIndex(sessions), playerId, thresholds);
}

// ---- Scoring -----------------------------------------------------------------

/**
 * How interesting each *kind* of angle is, before looking at the instance.
 *
 * The weights are the product decision that makes this "stats for everyone" rather
 * than "stats for the winner": the burns are weighted as highly as the brags. A
 * drought (0.85) outranks a career night (0.78); a nemesis (0.92) outranks a
 * favourite victim (0.88). Generic career summaries sit at the bottom — they exist
 * so that nobody ever gets nothing, not because they are worth reading.
 */
export const ANGLE_WEIGHTS: Record<StoryAngleId, number> = {
  nemesis: 0.92,
  'night-rank': 0.9,
  heater: 0.9,
  'favourite-victim': 0.88,
  'gone-missing': 0.86,
  drought: 0.85,
  slump: 0.84,
  'attendance-streak': 0.82,
  'never-won': 0.8,
  'career-night': 0.78,
  'worst-venue': 0.72,
  'best-venue': 0.68,
  'rebuy-dollars': 0.66,
  'best-day': 0.62,
  'worst-day': 0.62,
  'attendance-rate': 0.6,
  'early-exit': 0.6,
  'best-table-size': 0.58,
  'worst-table-size': 0.58,
  'played-together': 0.5,
  newcomer: 0.3,
  'career-balance': 0.25,
  'never-played': 0.15,
};

const ANGLE_FAMILIES: Record<StoryAngleId, AngleFamily> = {
  nemesis: 'rivalry',
  'favourite-victim': 'rivalry',
  'attendance-streak': 'attendance',
  'attendance-rate': 'attendance',
  'gone-missing': 'attendance',
  drought: 'drought',
  'never-won': 'drought',
  'best-day': 'split',
  'worst-day': 'split',
  'best-venue': 'split',
  'worst-venue': 'split',
  'best-table-size': 'split',
  'worst-table-size': 'split',
  'rebuy-dollars': 'rebuys',
  'played-together': 'social',
  'career-night': 'nights',
  'night-rank': 'nights',
  heater: 'form',
  slump: 'form',
  'early-exit': 'rebuys',
  'career-balance': 'career',
  newcomer: 'career',
  'never-played': 'career',
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Sample confidence ramp. An angle is never emitted below its minimum, so the ramp
 * starts at half credit there and reaches full credit at twice the minimum: two
 * dozen shared nights should beat the bare minimum four.
 */
const confidenceFor = (sample: number, minimum: number) =>
  clamp(sample / Math.max(1, minimum * 2), 0.5, 1);

/**
 * Recency decay, in group nights since the night the angle points at. Standing
 * facts (a rivalry, a drought that is still running) pass 0 and keep full credit.
 */
export function recencyFactor(nightsAgo: number): number {
  if (nightsAgo <= 1) return 1;
  if (nightsAgo <= 3) return 0.9;
  if (nightsAgo <= 6) return 0.8;
  if (nightsAgo <= 12) return 0.68;
  if (nightsAgo <= 25) return 0.55;
  return 0.45;
}

interface CandidateInput {
  id: StoryAngleId;
  tone: AngleTone;
  /** 0–1: how extreme this instance is. */
  strength: number;
  sampleSize: number;
  minimum: number;
  value: number;
  unit: AngleUnit;
  comparisonValue?: number | null;
  label?: string | null;
  subject?: { playerId: string; playerName: string } | null;
  sessionId?: string | null;
  date?: string | null;
  nightsAgo?: number;
  fallback?: boolean;
}

function toAngle(input: CandidateInput): StoryAngle {
  const weight = ANGLE_WEIGHTS[input.id];
  const strength = clamp(input.strength, 0, 1);
  const confidence = confidenceFor(input.sampleSize, input.minimum);
  const recency = recencyFactor(input.nightsAgo ?? 0);

  return {
    id: input.id,
    family: ANGLE_FAMILIES[input.id],
    tone: input.tone,
    score: clamp(Math.round(100 * weight * strength * confidence * recency), 1, 100),
    value: round(input.value),
    unit: input.unit,
    comparisonValue:
      input.comparisonValue === undefined || input.comparisonValue === null
        ? null
        : round(input.comparisonValue),
    label: input.label ?? null,
    subject: input.subject ?? null,
    sessionId: input.sessionId ?? null,
    date: input.date ?? null,
    sampleSize: input.sampleSize,
    fallback: input.fallback ?? false,
  };
}

/** Best first, one per family so the top angles never say the same thing twice. */
export function rankAngles(
  candidates: StoryAngle[],
  limit = MAX_ANGLES_PER_PLAYER
): StoryAngle[] {
  const seen = new Set<AngleFamily>();
  return [...candidates]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .filter((a) => {
      if (seen.has(a.family)) return false;
      seen.add(a.family);
      return true;
    })
    .slice(0, limit);
}

// ---- The player-story selector ----------------------------------------------

export interface StoryContext {
  playerId: string;
  playerName: string;
  nights: SubjectNight[];
  attendance: AttendanceSummary;
  drought: DroughtSummary;
  splits: PlayerSplits;
  rebuys: RebuySummary;
  departures: DepartureSummary;
  rankedNights: RankedNight[];
  rivalries: PlayerRivalries;
  /** Group nights between the given session and the latest one; large = stale. */
  nightsAgo: (sessionId: string) => number;
  thresholds?: AngleThresholds;
}

/**
 * Every candidate angle for one player, scored and ranked.
 *
 * The contract is that this never returns an empty list. A player with no angles
 * would be the exact failure the redesign exists to fix, so the career summary at
 * the bottom of the catalogue always qualifies and is flagged `fallback`.
 */
export function selectStoryAngles(ctx: StoryContext): StoryAngle[] {
  const t = ctx.thresholds ?? ANGLE_THRESHOLDS;
  const { nights } = ctx;
  const games = nights.length;
  const candidates: StoryAngle[] = [];

  const balance = round(nights.reduce((sum, n) => sum + n.profit, 0));
  const totalBuyIn = nights.reduce((sum, n) => sum + n.buyIn, 0);
  const overallAvg = games > 0 ? balance / games : 0;
  // Mean absolute night result — a scale for "is this gap big for *this* player".
  // Internal only: never returned, so no dispersion metric is ever exposed (D-002).
  const typicalSwing =
    games > 0
      ? Math.max(1, nights.reduce((sum, n) => sum + Math.abs(n.profit), 0) / games)
      : 1;

  // --- Nobody on the roster falls through ---
  if (games === 0) {
    return [
      toAngle({
        id: 'never-played',
        tone: 'neutral',
        strength: 1,
        sampleSize: 0,
        minimum: 1,
        value: 0,
        unit: 'count',
        fallback: true,
      }),
    ];
  }

  // --- Career summary: the guaranteed floor ---
  candidates.push(
    toAngle({
      id: 'career-balance',
      tone: balance > 0 ? 'brag' : balance < 0 ? 'burn' : 'neutral',
      strength: clamp(Math.abs(balance) / (typicalSwing * 3), 0.15, 1),
      sampleSize: games,
      minimum: 1,
      value: balance,
      unit: 'currency',
      comparisonValue: games,
      fallback: true,
    })
  );

  if (games <= 2) {
    candidates.push(
      toAngle({
        id: 'newcomer',
        tone: 'neutral',
        strength: 1,
        sampleSize: games,
        minimum: 1,
        value: games,
        unit: 'count',
        fallback: true,
      })
    );
  }

  // --- Rivalries ---
  const { nemesis, favouriteVictim, mostPlayedWith } = ctx.rivalries;
  if (nemesis && nemesis.dominance >= 60) {
    candidates.push(
      toAngle({
        id: 'nemesis',
        tone: 'burn',
        strength: (nemesis.losses / nemesis.sharedSessions - 0.5) / 0.35,
        sampleSize: nemesis.sharedSessions,
        minimum: t.rivalryMinSessions,
        value: nemesis.losses,
        unit: 'count',
        comparisonValue: nemesis.sharedSessions,
        subject: { playerId: nemesis.playerId, playerName: nemesis.playerName },
      })
    );
  }
  if (favouriteVictim && favouriteVictim.dominance >= 60) {
    candidates.push(
      toAngle({
        id: 'favourite-victim',
        tone: 'brag',
        strength: (favouriteVictim.wins / favouriteVictim.sharedSessions - 0.5) / 0.35,
        sampleSize: favouriteVictim.sharedSessions,
        minimum: t.rivalryMinSessions,
        value: favouriteVictim.wins,
        unit: 'count',
        comparisonValue: favouriteVictim.sharedSessions,
        subject: {
          playerId: favouriteVictim.playerId,
          playerName: favouriteVictim.playerName,
        },
      })
    );
  }
  if (mostPlayedWith) {
    candidates.push(
      toAngle({
        id: 'played-together',
        tone: 'neutral',
        strength: mostPlayedWith.sharedSessions / 20,
        sampleSize: mostPlayedWith.sharedSessions,
        minimum: t.coAttendanceMinSessions,
        value: mostPlayedWith.sharedSessions,
        unit: 'nights',
        subject: {
          playerId: mostPlayedWith.playerBId,
          playerName: mostPlayedWith.playerBName,
        },
      })
    );
  }

  // --- Attendance ---
  const att = ctx.attendance;
  if (att.currentStreak >= t.streakBadgeMinNights) {
    candidates.push(
      toAngle({
        id: 'attendance-streak',
        tone: 'brag',
        strength: att.currentStreak / 8,
        sampleSize: att.eligible,
        minimum: t.streakBadgeMinNights,
        value: att.currentStreak,
        unit: 'nights',
        comparisonValue: att.eligible,
        date: att.lastPlayedDate,
      })
    );
  }
  if (att.eligible >= t.attendanceMinSessions && att.attendanceRate >= 75) {
    candidates.push(
      toAngle({
        id: 'attendance-rate',
        tone: 'brag',
        strength: (att.attendanceRate - 75) / 25,
        sampleSize: att.eligible,
        minimum: t.attendanceMinSessions,
        value: att.attendanceRate,
        unit: 'percent',
        comparisonValue: att.eligible,
      })
    );
  }
  if (att.missedInARow >= 2) {
    candidates.push(
      toAngle({
        id: 'gone-missing',
        tone: 'burn',
        strength: att.missedInARow / 5,
        sampleSize: att.eligible,
        minimum: 2,
        value: att.missedInARow,
        unit: 'nights',
        comparisonValue: att.eligible,
        date: att.lastPlayedDate,
      })
    );
  }

  // --- Drought ---
  const dr = ctx.drought;
  if (!dr.hasEverWon && games >= t.droughtMinNights) {
    candidates.push(
      toAngle({
        id: 'never-won',
        tone: 'burn',
        strength: games / 6,
        sampleSize: games,
        minimum: t.droughtMinNights,
        value: games,
        unit: 'nights',
      })
    );
  } else if (dr.nightsSinceLastWin !== null && dr.nightsSinceLastWin >= t.droughtMinNights) {
    candidates.push(
      toAngle({
        id: 'drought',
        tone: 'burn',
        strength: dr.nightsSinceLastWin / 8,
        sampleSize: games,
        minimum: t.droughtMinNights,
        value: dr.nightsSinceLastWin,
        unit: 'nights',
        sessionId: dr.lastWinSessionId,
        date: dr.lastWinDate,
      })
    );
  }

  // --- Splits: only when the slice genuinely differs from their own baseline ---
  const splitAngle = (
    summary: SplitSummary,
    bestId: StoryAngleId,
    worstId: StoryAngleId
  ) => {
    if (summary.best && summary.best.avgProfit > overallAvg) {
      candidates.push(
        toAngle({
          id: bestId,
          tone: 'brag',
          strength: (summary.best.avgProfit - overallAvg) / typicalSwing,
          sampleSize: summary.best.sessions,
          minimum: t.splitMinSessions,
          value: summary.best.avgProfit,
          unit: 'currency',
          comparisonValue: round(overallAvg),
          label: summary.best.label,
        })
      );
    }
    if (summary.worst && summary.worst.avgProfit < overallAvg) {
      candidates.push(
        toAngle({
          id: worstId,
          tone: 'burn',
          strength: (overallAvg - summary.worst.avgProfit) / typicalSwing,
          sampleSize: summary.worst.sessions,
          minimum: t.splitMinSessions,
          value: summary.worst.avgProfit,
          unit: 'currency',
          comparisonValue: round(overallAvg),
          label: summary.worst.label,
        })
      );
    }
  };
  splitAngle(ctx.splits.dayOfWeek, 'best-day', 'worst-day');
  splitAngle(ctx.splits.venue, 'best-venue', 'worst-venue');
  splitAngle(ctx.splits.tableSize, 'best-table-size', 'worst-table-size');

  // --- Rebuy dollars ---
  if (ctx.rebuys.totalAmount > 0) {
    candidates.push(
      toAngle({
        id: 'rebuy-dollars',
        tone: 'burn',
        // Rebuys as a share of everything they have ever put in; half is a lot.
        strength: ctx.rebuys.totalAmount / Math.max(1, totalBuyIn) / 0.5,
        sampleSize: games,
        minimum: 1,
        value: ctx.rebuys.totalAmount,
        unit: 'currency',
        comparisonValue: ctx.rebuys.count,
      })
    );
  }

  // --- Early departures ---
  const dep = ctx.departures;
  if (
    dep.meaningful &&
    dep.earlyExits >= 2 &&
    dep.avgProfitWhenEarly !== null &&
    dep.avgProfitWhenStayed !== null &&
    dep.avgProfitWhenEarly < dep.avgProfitWhenStayed
  ) {
    candidates.push(
      toAngle({
        id: 'early-exit',
        tone: 'burn',
        strength: (dep.avgProfitWhenStayed - dep.avgProfitWhenEarly) / typicalSwing,
        sampleSize: dep.trackedSessions,
        minimum: t.departureMinTracked,
        value: dep.avgProfitWhenEarly,
        unit: 'currency',
        comparisonValue: dep.avgProfitWhenStayed,
      })
    );
  }

  // --- Nights ---
  const best = ctx.rankedNights[0];
  if (best && best.profit > 0) {
    candidates.push(
      toAngle({
        id: 'career-night',
        tone: 'brag',
        strength: best.profit / (typicalSwing * 3),
        sampleSize: games,
        minimum: 1,
        value: best.profit,
        unit: 'currency',
        comparisonValue: best.outOf,
        sessionId: best.sessionId,
        date: best.date,
        nightsAgo: ctx.nightsAgo(best.sessionId),
      })
    );
  }

  const latestSessionId = nights[games - 1].sessionId;
  const latest = ctx.rankedNights.find((r) => r.sessionId === latestSessionId);
  const spread =
    ctx.rankedNights.length > 0
      ? ctx.rankedNights[0].profit - ctx.rankedNights[ctx.rankedNights.length - 1].profit
      : 0;
  if (latest && latest.outOf >= 5 && spread > 0) {
    const fromBottom = latest.outOf - latest.rank + 1;
    if (latest.rank <= 3 && latest.profit > 0) {
      candidates.push(
        toAngle({
          id: 'night-rank',
          tone: 'brag',
          strength: (4 - latest.rank) / 3,
          sampleSize: latest.outOf,
          minimum: 5,
          value: latest.rank,
          unit: 'rank',
          comparisonValue: latest.outOf,
          sessionId: latest.sessionId,
          date: latest.date,
          nightsAgo: ctx.nightsAgo(latest.sessionId),
        })
      );
    } else if (fromBottom <= 3 && latest.profit < 0) {
      candidates.push(
        toAngle({
          id: 'night-rank',
          tone: 'burn',
          strength: (4 - fromBottom) / 3,
          sampleSize: latest.outOf,
          minimum: 5,
          value: latest.rank,
          unit: 'rank',
          comparisonValue: latest.outOf,
          sessionId: latest.sessionId,
          date: latest.date,
          nightsAgo: ctx.nightsAgo(latest.sessionId),
        })
      );
    }
  }

  // --- Form ---
  let streakType: 'win' | 'loss' | 'none' = 'none';
  let streakCount = 0;
  for (let i = games - 1; i >= 0; i--) {
    const profit = nights[i].profit;
    if (profit === 0) break;
    const type = profit > 0 ? 'win' : 'loss';
    if (streakType === 'none') {
      streakType = type;
      streakCount = 1;
    } else if (streakType === type) {
      streakCount++;
    } else {
      break;
    }
  }
  if (streakType !== 'none' && streakCount >= t.streakBadgeMinNights) {
    candidates.push(
      toAngle({
        id: streakType === 'win' ? 'heater' : 'slump',
        tone: streakType === 'win' ? 'brag' : 'burn',
        strength: streakCount / 5,
        sampleSize: games,
        minimum: t.streakBadgeMinNights,
        value: streakCount,
        unit: 'nights',
        sessionId: latestSessionId,
        date: nights[games - 1].date,
        nightsAgo: ctx.nightsAgo(latestSessionId),
      })
    );
  }

  return rankAngles(candidates, t.maxAnglesPerPlayer);
}

// ---- Whole-group assembly ----------------------------------------------------

export function computeGroupAngles(
  groupId: string,
  sessions: AngleSessionRow[],
  roster: AngleRosterRow[],
  thresholds: AngleThresholds = ANGLE_THRESHOLDS
): GroupAnglesResponse {
  const ordered = orderSessions(sessions);
  const nightsByPlayer = buildNightsByPlayer(ordered);
  const pairs = buildPairIndex(ordered);

  // Group nights between a session and the newest one — the recency clock.
  const indexById = new Map(ordered.map((s, i) => [s.id, i]));
  const nightsAgo = (sessionId: string) =>
    ordered.length - 1 - (indexById.get(sessionId) ?? ordered.length - 1);

  // Names seen in history cover players who have since been removed from the roster.
  const namesFromHistory = new Map<string, string>();
  for (const s of ordered) for (const e of s.entries) namesFromHistory.set(e.playerId, e.playerName);

  const known = new Map<string, AngleRosterRow>();
  for (const p of roster) known.set(p.id, p);
  for (const [id, name] of namesFromHistory) {
    if (!known.has(id)) known.set(id, { id, name, isActive: false });
  }

  const players: PlayerAngles[] = [...known.values()].map((p) => {
    const nights = nightsByPlayer.get(p.id) ?? [];
    const splits = computeSplits(nights, thresholds.splitMinSessions);
    const rankedNights = rankNights(nights);
    const attendance = computeAttendance(ordered, p.id);
    const drought = computeDrought(nights);
    const rebuys = computeRebuySummary(nights);
    const departures = computeDepartures(nights, thresholds.departureMinTracked);
    const rivalries = rivalriesFromIndex(pairs, p.id, thresholds);

    return {
      playerId: p.id,
      playerName: p.name,
      isActive: p.isActive,
      games: nights.length,
      balance: round(nights.reduce((sum, n) => sum + n.profit, 0)),
      attendance,
      drought,
      splits,
      rebuys,
      departures,
      bestNights: rankedNights.slice(0, 3),
      latestNight:
        nights.length > 0
          ? rankedNights.find((r) => r.sessionId === nights[nights.length - 1].sessionId) ?? null
          : null,
      rivalries,
      angles: selectStoryAngles({
        playerId: p.id,
        playerName: p.name,
        nights,
        attendance,
        drought,
        splits,
        rebuys,
        departures,
        rankedNights,
        rivalries,
        nightsAgo,
        thresholds,
      }),
    };
  });

  const allNights = [...nightsByPlayer.values()].flat();

  return {
    groupId,
    totalSessions: ordered.length,
    firstSessionDate: ordered.length > 0 ? ordered[0].date : null,
    lastSessionDate: ordered.length > 0 ? ordered[ordered.length - 1].date : null,
    splits: computeSplits(allNights, thresholds.splitMinSessions),
    players,
    coAttendance: coAttendanceFromIndex(pairs),
    thresholds,
  };
}

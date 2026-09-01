import type { Session } from '@/types';

/**
 * Head to head, for everyone against everyone.
 *
 * The server already builds this matrix — `insightsService.pairStats` walks every
 * pair of players over every night — and then throws all of it away except the
 * single biggest rivalry. Rather than ask the API for N²/2 pairings one request
 * at a time, this rebuilds the whole grid from the group's sessions, which the
 * client has already fetched and cached for the sessions list.
 *
 * The rules below mirror the server's exactly, so a pairing never reads one way
 * on the Rivals tab and another way in Insights:
 *
 *   - a "win" is finishing the night ahead of the other player, on profit;
 *   - an exactly equal night is a tie for both of them, not a win for either;
 *   - the differential is the running sum of (A's profit − B's profit), which is
 *     a rivalry stat about two people on the same nights, not a debt ledger
 *     carried across sessions (DECISIONS D-001);
 *   - a streak ends at a tie rather than counting through it;
 *   - only completed, non-deleted nights count (DECISIONS D-006) — a live table
 *     stores `cashOut = 0` for everyone still sitting.
 *
 * No time-based metrics, no ROI, no variance (D-002). Everything here is
 * derived on read from rows that already exist (D-004).
 */

export interface RivalThresholds {
  /**
   * Shared nights before a pairing is allowed to mean anything. 4, matching the
   * server's `rivalryMinSessions` in `anglesRules.ts`.
   */
  minSessions: number;
  /**
   * The leader's share of the shared nights, as a percent, before the app will
   * say one player owns another. 60, matching the `dominance >= 60` gate the
   * server applies before it will call someone a nemesis.
   */
  minDominance: number;
}

export const DEFAULT_RIVAL_THRESHOLDS: RivalThresholds = {
  minSessions: 4,
  minDominance: 60,
};

export type PairOutcome = 'a' | 'b' | 'tie';

/** One night two players both sat at. */
export interface RivalNight {
  sessionId: string;
  date: string;
  outcome: PairOutcome;
  aProfit: number;
  bProfit: number;
}

/** The undirected record between two players. `a` and `b` are stable, sorted by id. */
export interface RivalPair {
  key: string;
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  shared: number;
  aWins: number;
  bWins: number;
  ties: number;
  /** A's total profit minus B's, across their shared nights only. */
  differential: number;
  streakHolderId: string | null;
  streakCount: number;
  /** Chronological, oldest first. */
  nights: RivalNight[];
}

export interface RivalPlayer {
  id: string;
  name: string;
  /** Completed nights this player appeared at. */
  nights: number;
}

export interface RivalMatrix {
  /** Most nights played first, then alphabetical. Includes roster members with none. */
  players: RivalPlayer[];
  /** Most shared nights first. */
  pairs: RivalPair[];
  byKey: Map<string, RivalPair>;
  /** Completed, non-deleted nights the matrix was built from. */
  totalSessions: number;
}

export type RivalEdge = 'own' | 'owned' | 'even';

/** A pair read from one player's side — what a matrix cell and a ledger row show. */
export interface RivalRecord {
  subjectId: string;
  subjectName: string;
  opponentId: string;
  opponentName: string;
  shared: number;
  wins: number;
  losses: number;
  ties: number;
  /** Subject's profit minus the opponent's, across their shared nights. */
  differential: number;
  /** The leader's share of the shared nights, 0–100. Describes the pairing, so it does not flip. */
  dominance: number;
  edge: RivalEdge;
  /** Has this pairing played enough nights to be worth a claim? */
  qualified: boolean;
  streakHolderId: string | null;
  streakCount: number;
  pair: RivalPair;
}

/** One "X owns Y" sentence, already gated. */
export interface OwnershipClaim {
  leaderId: string;
  leaderName: string;
  trailerId: string;
  trailerName: string;
  wins: number;
  losses: number;
  ties: number;
  shared: number;
  dominance: number;
  /** The leader's profit minus the trailer's. */
  differential: number;
  pair: RivalPair;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** Ids sorted so the same two people always produce the same key. */
export const pairKey = (x: string, y: string): string => (x < y ? `${x}|${y}` : `${y}|${x}`);

const isCounted = (s: Session): boolean =>
  s.deletedAt === null && (s.status === undefined || s.status === 'COMPLETED');

const chronological = (a: Session, b: Session): number =>
  new Date(a.date).getTime() - new Date(b.date).getTime() ||
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

interface Mutable extends Omit<RivalPair, 'streakHolderId' | 'streakCount'> {
  streakHolderId: string | null;
  streakCount: number;
}

/**
 * Build the whole grid.
 *
 * `roster` is optional but worth passing: it supplies current names (an entry
 * carries the name as it was), and it keeps players who have never sat down in
 * the grid, so a new member is visibly part of the group rather than absent.
 */
export function buildRivalMatrix(
  sessions: Session[],
  roster?: ReadonlyArray<{ id: string; name: string }>
): RivalMatrix {
  const rosterName = new Map((roster ?? []).map((p) => [p.id, p.name]));
  const nameOf = (id: string, fallback: string) => rosterName.get(id) ?? fallback;

  const counted = sessions.filter(isCounted).sort(chronological);
  const nightsPlayed = new Map<string, number>();
  const seenName = new Map<string, string>();
  const pairs = new Map<string, Mutable>();

  for (const session of counted) {
    const entries = (session.entries ?? []).filter((e) => !!e?.playerId);
    const players = entries.map((e) => ({
      id: e.playerId,
      name: nameOf(e.playerId, e.player?.name ?? 'Unknown'),
      profit: round((e.cashOut ?? 0) - (e.buyIn ?? 0)),
    }));

    for (const p of players) {
      nightsPlayed.set(p.id, (nightsPlayed.get(p.id) ?? 0) + 1);
      seenName.set(p.id, p.name);
    }

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const [x, y] = [players[i], players[j]];
        if (x.id === y.id) continue;
        const key = pairKey(x.id, y.id);
        // `a` is always the lower id, so the pair reads the same from either side.
        const [a, b] = x.id < y.id ? [x, y] : [y, x];

        let pair = pairs.get(key);
        if (!pair) {
          pair = {
            key,
            aId: a.id,
            aName: a.name,
            bId: b.id,
            bName: b.name,
            shared: 0,
            aWins: 0,
            bWins: 0,
            ties: 0,
            differential: 0,
            streakHolderId: null,
            streakCount: 0,
            nights: [],
          };
          pairs.set(key, pair);
        }
        pair.aName = a.name;
        pair.bName = b.name;
        pair.shared += 1;
        pair.differential += a.profit - b.profit;

        const outcome: PairOutcome =
          a.profit > b.profit ? 'a' : b.profit > a.profit ? 'b' : 'tie';
        if (outcome === 'a') pair.aWins += 1;
        else if (outcome === 'b') pair.bWins += 1;
        else pair.ties += 1;

        pair.nights.push({
          sessionId: session.id,
          date: session.date,
          outcome,
          aProfit: a.profit,
          bProfit: b.profit,
        });
      }
    }
  }

  for (const pair of pairs.values()) {
    pair.differential = round(pair.differential);
    // Walk back from the most recent night while the same player keeps winning.
    for (let i = pair.nights.length - 1; i >= 0; i--) {
      const { outcome } = pair.nights[i];
      if (outcome === 'tie') break;
      const holder = outcome === 'a' ? pair.aId : pair.bId;
      if (pair.streakHolderId === null) {
        pair.streakHolderId = holder;
        pair.streakCount = 1;
      } else if (pair.streakHolderId === holder) {
        pair.streakCount += 1;
      } else break;
    }
  }

  const ids = new Set<string>([...nightsPlayed.keys(), ...rosterName.keys()]);
  const players: RivalPlayer[] = [...ids]
    .map((id) => ({
      id,
      name: nameOf(id, seenName.get(id) ?? 'Unknown'),
      nights: nightsPlayed.get(id) ?? 0,
    }))
    .sort((x, y) => y.nights - x.nights || x.name.localeCompare(y.name));

  const list = [...pairs.values()].sort(
    (x, y) =>
      y.shared - x.shared ||
      x.aName.localeCompare(y.aName) ||
      x.bName.localeCompare(y.bName)
  );

  return {
    players,
    pairs: list,
    byKey: new Map(list.map((p) => [p.key, p as RivalPair])),
    totalSessions: counted.length,
  };
}

export const findPair = (
  matrix: RivalMatrix,
  x: string,
  y: string
): RivalPair | null => (x === y ? null : (matrix.byKey.get(pairKey(x, y)) ?? null));

/** Read a pair from one player's side. */
export function toRecord(
  pair: RivalPair,
  subjectId: string,
  thresholds: RivalThresholds = DEFAULT_RIVAL_THRESHOLDS
): RivalRecord {
  const isA = pair.aId === subjectId;
  const wins = isA ? pair.aWins : pair.bWins;
  const losses = isA ? pair.bWins : pair.aWins;
  const differential = round(isA ? pair.differential : -pair.differential);

  return {
    subjectId,
    subjectName: isA ? pair.aName : pair.bName,
    opponentId: isA ? pair.bId : pair.aId,
    opponentName: isA ? pair.bName : pair.aName,
    shared: pair.shared,
    wins,
    losses,
    ties: pair.ties,
    differential,
    dominance:
      pair.shared > 0 ? round((Math.max(wins, losses) / pair.shared) * 100) : 0,
    edge: wins > losses ? 'own' : losses > wins ? 'owned' : 'even',
    qualified: pair.shared >= thresholds.minSessions,
    streakHolderId: pair.streakHolderId,
    streakCount: pair.streakCount,
    pair,
  };
}

/**
 * How hard to shade a matrix cell, 0–3.
 *
 * Driven by the *margin* as a share of the nights played, not the raw win
 * count, so 6-4 and 60-40 shade identically — both are "basically even". A
 * pairing that has not cleared the sample gate never shades at all: three
 * straight wins is a 100% record and completely meaningless.
 */
export function dominanceLevel(record: RivalRecord): 0 | 1 | 2 | 3 {
  if (!record.qualified || record.shared === 0) return 0;
  const lead = Math.abs(record.wins - record.losses) / record.shared;
  if (lead <= 0.08) return 0;
  if (lead <= 0.22) return 1;
  if (lead <= 0.4) return 2;
  return 3;
}

/**
 * Every opponent one player has faced, loudest pairing first.
 *
 * Sorted so a player's card opens on the pairings worth arguing about:
 * qualified before thin, then by how lopsided, then by how many nights.
 */
export function recordsFor(
  matrix: RivalMatrix,
  subjectId: string,
  thresholds: RivalThresholds = DEFAULT_RIVAL_THRESHOLDS
): RivalRecord[] {
  return matrix.pairs
    .filter((p) => p.aId === subjectId || p.bId === subjectId)
    .map((p) => toRecord(p, subjectId, thresholds))
    .sort(
      (x, y) =>
        Number(y.qualified) - Number(x.qualified) ||
        dominanceLevel(y) - dominanceLevel(x) ||
        y.dominance - x.dominance ||
        y.shared - x.shared ||
        x.opponentName.localeCompare(y.opponentName)
    );
}

/**
 * The "X owns Y" sentences, gated exactly the way the server gates a nemesis:
 * at least `minSessions` shared nights and at least `minDominance` percent of
 * them. Anything short of that gets said about nobody — a quiet grid beats a
 * confident lie.
 */
export function ownershipClaims(
  matrix: RivalMatrix,
  thresholds: RivalThresholds = DEFAULT_RIVAL_THRESHOLDS
): OwnershipClaim[] {
  const claims: OwnershipClaim[] = [];

  for (const pair of matrix.pairs) {
    if (pair.shared < thresholds.minSessions) continue;
    if (pair.aWins === pair.bWins) continue;
    const leaderIsA = pair.aWins > pair.bWins;
    const wins = leaderIsA ? pair.aWins : pair.bWins;
    const losses = leaderIsA ? pair.bWins : pair.aWins;
    const dominance = round((wins / pair.shared) * 100);
    if (dominance < thresholds.minDominance) continue;

    claims.push({
      leaderId: leaderIsA ? pair.aId : pair.bId,
      leaderName: leaderIsA ? pair.aName : pair.bName,
      trailerId: leaderIsA ? pair.bId : pair.aId,
      trailerName: leaderIsA ? pair.bName : pair.aName,
      wins,
      losses,
      ties: pair.ties,
      shared: pair.shared,
      dominance,
      differential: round(leaderIsA ? pair.differential : -pair.differential),
      pair,
    });
  }

  return claims.sort(
    (x, y) =>
      y.dominance - x.dominance ||
      y.shared - x.shared ||
      x.leaderName.localeCompare(y.leaderName)
  );
}

/**
 * The pairing to open on.
 *
 * Weighted towards nights played rather than pure lopsidedness — a 4-0 that
 * happened twice in March is not the group's main event. Falls back to the
 * most-played pairing when nothing has cleared the gate yet, so a young group
 * still gets a headline.
 */
export function topRivalry(
  matrix: RivalMatrix,
  thresholds: RivalThresholds = DEFAULT_RIVAL_THRESHOLDS
): RivalPair | null {
  if (matrix.pairs.length === 0) return null;
  const qualified = matrix.pairs.filter((p) => p.shared >= thresholds.minSessions);
  const pool = qualified.length > 0 ? qualified : matrix.pairs;

  // shared nights carry the weight; the margin only breaks near-ties.
  const heat = (p: RivalPair) =>
    p.shared + (Math.abs(p.aWins - p.bWins) / Math.max(1, p.shared)) * 4;

  return pool.reduce((best, p) => (heat(p) > heat(best) ? p : best), pool[0]);
}

/** Whose card to open on mobile: the player who has faced the most people, most often. */
export function mostConnectedPlayer(matrix: RivalMatrix): RivalPlayer | null {
  const withPairs = matrix.players.filter((p) =>
    matrix.pairs.some((pair) => pair.aId === p.id || pair.bId === p.id)
  );
  return withPairs[0] ?? null;
}

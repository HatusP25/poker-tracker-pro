import { prisma } from '../lib/prisma';
import { computeNightTitles } from './banterService';
import { NightTitle } from '../types/banter';
import { withDerivedRebuyEvents } from '../utils/rebuys';
import { filterRowsToActive, fetchActivePlayerIds } from './activeRoster';
import { COMPLETED_SESSION_FILTER } from './statsRules';
import {
  computeRankings,
  sessionsUpTo,
  computeRankingChanges,
  computeHighlights,
  computeStreakUpdates,
  computeMilestones,
  type SummarySessionRow,
  type RankingChange,
  type SessionHighlights,
  type StreakUpdate,
  type Milestone,
} from './sessionSummaryRules';

interface SessionSummary {
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

/**
 * Post-session summary: ranking changes, highlights, streaks, milestones, titles.
 *
 * Previously this issued one full-history query *per player in the session*, plus a
 * complete ranking recomputation per player nested inside that loop, and had no
 * unit tests because every rule was tangled up with Prisma. It now fetches the
 * group's history once and delegates to the pure functions in
 * `sessionSummaryRules.ts`.
 */
export class SessionSummaryService {
  async getSessionSummary(sessionId: string, groupId: string): Promise<SessionSummary> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        entries: { include: { player: true } },
        rebuyEvents: true,
        group: true,
      },
    });

    if (!session || session.groupId !== groupId) {
      throw new Error('Session not found or does not belong to this group');
    }

    // One query for the whole group's history, instead of one per player.
    // In-progress nights are excluded — their cashOut is 0 for everyone still at
    // the table, which would sink every ranking and streak this summary reports.
    const history = await prisma.session.findMany({
      where: { groupId, ...COMPLETED_SESSION_FILTER },
      include: { entries: { include: { player: { select: { name: true } } } } },
      orderBy: { date: 'asc' },
    });

    const rows: SummarySessionRow[] = history.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      createdAt: s.createdAt.toISOString(),
      entries: s.entries.map((e) => ({
        playerId: e.playerId,
        playerName: e.player.name,
        buyIn: e.buyIn,
        cashOut: e.cashOut,
      })),
    }));

    const entries = session.entries.map((e) => ({
      playerId: e.playerId,
      playerName: e.player.name,
      buyIn: e.buyIn,
      cashOut: e.cashOut,
    }));

    const activeIds = await fetchActivePlayerIds(groupId);

    // D-D: the cross-night rules (ranks, streaks, milestones) are derived
    // surfaces and exclude deactivated players. The night's own facts — pot,
    // player count, highlights, titles — describe the evening as it happened (D-A).
    //
    // Both inputs must be filtered together: all three cross-night rules iterate
    // the night's entry list and look each player up in the history. Filtering
    // only the history would render a deactivated player as a rank-0 "brand new
    // player" with a streak computed from nothing.
    const activeRows = filterRowsToActive(rows, activeIds);
    const activeEntries = entries.filter((e) => activeIds.has(e.playerId));

    const cutoff = session.date.toISOString();
    const rankingsBefore = computeRankings(sessionsUpTo(activeRows, cutoff, true));
    const rankingsAfter = computeRankings(sessionsUpTo(activeRows, cutoff, false));

    // Recorded rebuys win; nights that never recorded any derive from the totals.
    const rebuyEvents = withDerivedRebuyEvents(
      session.entries,
      session.rebuyEvents,
      session.group.defaultBuyIn
    );
    const rebuysByPlayer = new Map<string, number>();
    for (const r of rebuyEvents) {
      rebuysByPlayer.set(r.playerId, (rebuysByPlayer.get(r.playerId) ?? 0) + 1);
    }

    return {
      session: {
        id: session.id,
        date: session.date.toISOString(),
        playerCount: session.entries.length,
        totalPot: session.entries.reduce((sum, e) => sum + e.buyIn, 0),
      },
      rankingChanges: computeRankingChanges(activeEntries, rankingsBefore, rankingsAfter),
      highlights: computeHighlights(entries, rebuysByPlayer),
      streaks: computeStreakUpdates(activeRows, activeEntries, cutoff),
      milestones: computeMilestones(
        activeRows,
        activeEntries,
        cutoff,
        rankingsBefore,
        rankingsAfter
      ),
      titles: computeNightTitles(entries, rebuyEvents),
    };
  }
}

export const sessionSummaryService = new SessionSummaryService();

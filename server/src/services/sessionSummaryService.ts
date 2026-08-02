import { prisma } from '../lib/prisma';
import { computeNightTitles } from './banterService';
import { NightTitle } from '../types/banter';
import { withDerivedRebuyEvents } from '../utils/rebuys';
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
    const history = await prisma.session.findMany({
      where: { groupId, deletedAt: null },
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

    const cutoff = session.date.toISOString();
    const rankingsBefore = computeRankings(sessionsUpTo(rows, cutoff, true));
    const rankingsAfter = computeRankings(sessionsUpTo(rows, cutoff, false));

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
      rankingChanges: computeRankingChanges(entries, rankingsBefore, rankingsAfter),
      highlights: computeHighlights(entries, rebuysByPlayer),
      streaks: computeStreakUpdates(rows, entries, cutoff),
      milestones: computeMilestones(rows, entries, cutoff, rankingsBefore, rankingsAfter),
      titles: computeNightTitles(entries, rebuyEvents),
    };
  }
}

export const sessionSummaryService = new SessionSummaryService();

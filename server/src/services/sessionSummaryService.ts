import { prisma } from '../lib/prisma';

interface RankingChange {
  playerId: string;
  playerName: string;
  oldRank: number;
  newRank: number;
  change: number;
  profit: number;
}

interface SessionHighlights {
  biggestWinner: { playerId: string; name: string; profit: number };
  biggestLoser: { playerId: string; name: string; profit: number };
  mostRebuys?: { playerId: string; name: string; rebuys: number };
  biggestComeback?: { playerId: string; name: string; description: string };
}

interface StreakUpdate {
  playerId: string;
  playerName: string;
  type: 'win' | 'loss';
  count: number;
  isNew: boolean;
}

interface Milestone {
  playerId: string;
  playerName: string;
  type: 'best_session' | 'total_games' | 'total_profit' | 'top_3';
  description: string;
  value?: number;
}

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
}

export class SessionSummaryService {
  constructor() {
    // No dependencies needed - using Prisma directly
  }

  /**
   * Get comprehensive session summary with ranking changes, highlights, streaks, and milestones
   */
  async getSessionSummary(sessionId: string, groupId: string): Promise<SessionSummary> {
    // 1. Get the completed session with all entries and player data
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
        group: true,
      },
    });

    if (!session || session.groupId !== groupId) {
      throw new Error('Session not found or does not belong to this group');
    }

    const playerCount = session.entries.length;
    const totalPot = session.entries.reduce((sum, e) => sum + e.buyIn, 0);

    // 2. Calculate rankings BEFORE this session (exclude current session)
    const rankingsBefore = await this.calculateRankings(groupId, session.date, true);

    // 3. Calculate rankings AFTER this session (include current session)
    const rankingsAfter = await this.calculateRankings(groupId, session.date, false);

    // 4. Calculate ranking changes for players in this session
    const rankingChanges = this.calculateRankingChanges(
      session.entries,
      rankingsBefore,
      rankingsAfter
    );

    // 5. Find session highlights
    const highlights = this.calculateHighlights(session.entries, session.group.defaultBuyIn);

    // 6. Calculate streak updates
    const streaks = await this.calculateStreaks(session.entries, groupId, session.date);

    // 7. Check for milestones
    const milestones = await this.calculateMilestones(session.entries, groupId, rankingsAfter);

    return {
      session: {
        id: session.id,
        date: session.date.toISOString(),
        playerCount,
        totalPot,
      },
      rankingChanges,
      highlights,
      streaks,
      milestones,
    };
  }

  /**
   * Calculate rankings for a specific point in time
   * @param excludeCurrentDate - if true, exclude sessions on or after this date
   */
  private async calculateRankings(
    groupId: string,
    currentDate: Date,
    excludeCurrentDate: boolean
  ) {
    // Get all sessions up to (and optionally excluding) the current date
    const sessions = await prisma.session.findMany({
      where: {
        groupId,
        date: excludeCurrentDate ? { lt: currentDate } : { lte: currentDate },
        deletedAt: null,
      },
      include: {
        entries: {
          include: {
            player: true,
          },
        },
      },
    });

    // Calculate stats for each player
    const playerStats = new Map<
      string,
      { playerId: string; playerName: string; balance: number; games: number }
    >();

    for (const session of sessions) {
      for (const entry of session.entries) {
        const profit = entry.cashOut - entry.buyIn;
        const existing = playerStats.get(entry.playerId);

        if (existing) {
          existing.balance += profit;
          existing.games += 1;
        } else {
          playerStats.set(entry.playerId, {
            playerId: entry.playerId,
            playerName: entry.player.name,
            balance: profit,
            games: 1,
          });
        }
      }
    }

    // Sort by balance descending, then by games descending
    const rankings = Array.from(playerStats.values()).sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      return b.games - a.games;
    });

    // Assign ranks
    const rankedPlayers = new Map<string, number>();
    rankings.forEach((player, index) => {
      rankedPlayers.set(player.playerId, index + 1);
    });

    return rankedPlayers;
  }

  /**
   * Calculate ranking changes for players in the session
   */
  private calculateRankingChanges(
    entries: any[],
    rankingsBefore: Map<string, number>,
    rankingsAfter: Map<string, number>
  ): RankingChange[] {
    const changes: RankingChange[] = [];

    for (const entry of entries) {
      const profit = entry.cashOut - entry.buyIn;
      const oldRank = rankingsBefore.get(entry.playerId) || 0; // 0 means new player
      const newRank = rankingsAfter.get(entry.playerId) || 0;

      // Calculate change (negative means moved up in ranking, positive means moved down)
      const change = oldRank === 0 ? 0 : oldRank - newRank;

      changes.push({
        playerId: entry.playerId,
        playerName: entry.player.name,
        oldRank,
        newRank,
        change,
        profit,
      });
    }

    // Sort by new rank
    changes.sort((a, b) => {
      if (a.newRank === 0) return 1;
      if (b.newRank === 0) return -1;
      return a.newRank - b.newRank;
    });

    return changes;
  }

  /**
   * Calculate session highlights
   */
  private calculateHighlights(entries: any[], defaultBuyIn: number): SessionHighlights {
    // Find biggest winner and loser
    let biggestWinner = entries[0];
    let biggestLoser = entries[0];
    let maxProfit = entries[0].cashOut - entries[0].buyIn;
    let minProfit = maxProfit;

    for (const entry of entries) {
      const profit = entry.cashOut - entry.buyIn;
      if (profit > maxProfit) {
        maxProfit = profit;
        biggestWinner = entry;
      }
      if (profit < minProfit) {
        minProfit = profit;
        biggestLoser = entry;
      }
    }

    // Find most rebuys
    let mostRebuysEntry = null;
    let maxRebuys = 0;
    for (const entry of entries) {
      const rebuys = Math.max(0, (entry.buyIn - defaultBuyIn) / defaultBuyIn);
      if (rebuys > maxRebuys) {
        maxRebuys = rebuys;
        mostRebuysEntry = entry;
      }
    }

    const highlights: SessionHighlights = {
      biggestWinner: {
        playerId: biggestWinner.playerId,
        name: biggestWinner.player.name,
        profit: maxProfit,
      },
      biggestLoser: {
        playerId: biggestLoser.playerId,
        name: biggestLoser.player.name,
        profit: minProfit,
      },
    };

    if (mostRebuysEntry && maxRebuys > 0) {
      highlights.mostRebuys = {
        playerId: mostRebuysEntry.playerId,
        name: mostRebuysEntry.player.name,
        rebuys: Math.round(maxRebuys),
      };
    }

    return highlights;
  }

  /**
   * Calculate streak updates for players
   */
  private async calculateStreaks(
    entries: any[],
    groupId: string,
    currentDate: Date
  ): Promise<StreakUpdate[]> {
    const streaks: StreakUpdate[] = [];

    for (const entry of entries) {
      const profit = entry.cashOut - entry.buyIn;
      if (profit === 0) continue; // Skip break-even

      // Get player's recent sessions (ordered by date descending)
      const recentSessions = await prisma.session.findMany({
        where: {
          groupId,
          date: { lte: currentDate },
          deletedAt: null,
          entries: {
            some: {
              playerId: entry.playerId,
            },
          },
        },
        include: {
          entries: {
            where: {
              playerId: entry.playerId,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        take: 10, // Look at last 10 sessions max
      });

      // Calculate current streak
      const currentType: 'win' | 'loss' = profit > 0 ? 'win' : 'loss';
      let streakCount = 0;
      let isNew = true;

      for (const session of recentSessions) {
        const sessionEntry = session.entries[0];
        const sessionProfit = sessionEntry.cashOut - sessionEntry.buyIn;

        if (sessionProfit === 0) continue; // Skip break-even

        const sessionType: 'win' | 'loss' = sessionProfit > 0 ? 'win' : 'loss';

        if (sessionType === currentType) {
          streakCount++;
        } else {
          break; // Streak broken
        }
      }

      // Only report streaks of 2 or more
      if (streakCount >= 2) {
        // Check if this is a new streak (previous session was opposite result)
        if (recentSessions.length > 1) {
          const prevSessionEntry = recentSessions[1].entries[0];
          const prevProfit = prevSessionEntry.cashOut - prevSessionEntry.buyIn;
          const prevType: 'win' | 'loss' | null =
            prevProfit === 0 ? null : prevProfit > 0 ? 'win' : 'loss';
          isNew = prevType !== currentType && prevType !== null;
        }

        streaks.push({
          playerId: entry.playerId,
          playerName: entry.player.name,
          type: currentType,
          count: streakCount,
          isNew,
        });
      }
    }

    return streaks;
  }

  /**
   * Calculate milestones achieved
   */
  private async calculateMilestones(
    entries: any[],
    groupId: string,
    rankingsAfter: Map<string, number>
  ): Promise<Milestone[]> {
    const milestones: Milestone[] = [];

    for (const entry of entries) {
      const profit = entry.cashOut - entry.buyIn;

      // Get player's all-time stats
      const playerSessions = await prisma.session.findMany({
        where: {
          groupId,
          deletedAt: null,
          entries: {
            some: {
              playerId: entry.playerId,
            },
          },
        },
        include: {
          entries: {
            where: {
              playerId: entry.playerId,
            },
          },
        },
      });

      // Calculate total games and best session
      const totalGames = playerSessions.length;
      let totalProfit = 0;
      let bestSession = profit;

      for (const session of playerSessions) {
        const sessionEntry = session.entries[0];
        const sessionProfit = sessionEntry.cashOut - sessionEntry.buyIn;
        totalProfit += sessionProfit;
        if (sessionProfit > bestSession) {
          bestSession = sessionProfit;
        }
      }

      // Best session ever
      if (profit > 0 && profit === bestSession) {
        milestones.push({
          playerId: entry.playerId,
          playerName: entry.player.name,
          type: 'best_session',
          description: `Best session ever!`,
          value: profit,
        });
      }

      // Total games milestones (10, 25, 50, 100)
      const gameMilestones = [10, 25, 50, 100];
      for (const milestone of gameMilestones) {
        if (totalGames === milestone) {
          milestones.push({
            playerId: entry.playerId,
            playerName: entry.player.name,
            type: 'total_games',
            description: `${milestone} games played!`,
            value: milestone,
          });
        }
      }

      // Total profit milestones for low-stakes games ($50, $100, $250, $500)
      const profitMilestones = [50, 100, 250, 500];
      for (const milestone of profitMilestones) {
        if (totalProfit >= milestone && totalProfit - profit < milestone) {
          milestones.push({
            playerId: entry.playerId,
            playerName: entry.player.name,
            type: 'total_profit',
            description: `Crossed $${milestone} total profit!`,
            value: milestone,
          });
        }
      }

      // First time in top 3
      const currentRank = rankingsAfter.get(entry.playerId);
      if (currentRank && currentRank <= 3) {
        // Check if they weren't in top 3 before
        const prevRank = await this.getPreviousRank(entry.playerId, groupId, entry.sessionId);
        if (!prevRank || prevRank > 3) {
          milestones.push({
            playerId: entry.playerId,
            playerName: entry.player.name,
            type: 'top_3',
            description: `Made it to top 3!`,
            value: currentRank,
          });
        }
      }
    }

    return milestones;
  }

  /**
   * Helper to get player's rank before current session
   */
  private async getPreviousRank(
    playerId: string,
    groupId: string,
    currentSessionId: string
  ): Promise<number | null> {
    const currentSession = await prisma.session.findUnique({
      where: { id: currentSessionId },
    });

    if (!currentSession) return null;

    const rankings = await this.calculateRankings(groupId, currentSession.date, true);
    return rankings.get(playerId) || null;
  }
}

export const sessionSummaryService = new SessionSummaryService();

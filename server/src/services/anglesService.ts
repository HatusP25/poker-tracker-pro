import { prisma } from '../lib/prisma';
import { GroupAnglesResponse } from '../types/angles';
import { withDerivedRebuyEvents } from '../utils/rebuys';
import { COMPLETED_SESSION_FILTER } from './statsRules';
import { computeGroupAngles, type AngleSessionRow } from './anglesRules';
import { filterRowsToActive } from './activeRoster';

/**
 * The angles endpoint: one pass over the group's history producing the whole
 * matrix — splits, attendance, droughts, rebuy dollars, departures, night ranks,
 * the co-attendance grid and every player's story angles.
 *
 * Deliberately one rich endpoint rather than ten thin ones. The Insights page
 * already costs six full-history scans per load; this adds one, and the client
 * slices a single cached payload for the hub, the rivals grid and every player
 * card instead of re-fetching per player.
 */
export class AnglesService {
  async getGroupAngles(groupId: string): Promise<GroupAnglesResponse> {
    const [group, sessions, roster] = await Promise.all([
      prisma.group.findUnique({ where: { id: groupId }, select: { defaultBuyIn: true } }),
      prisma.session.findMany({
        where: { groupId, ...COMPLETED_SESSION_FILTER },
        include: {
          entries: { include: { player: { select: { name: true } } } },
          rebuyEvents: true,
        },
        orderBy: { date: 'asc' },
      }),
      // F-14: deactivated players are absent from every derived surface, and the
      // angles payload feeds all of them — the rivals grid, standings story chips,
      // player cards. Filtering the roster here also stops `computeGroupAngles`
      // resurrecting them from history, since the entries naming them are gone too.
      prisma.player.findMany({
        where: { groupId, isActive: true },
        select: { id: true, name: true, isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const defaultBuyIn = group?.defaultBuyIn ?? 0;

    const rows: AngleSessionRow[] = sessions.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      createdAt: s.createdAt.toISOString(),
      location: s.location,
      entries: s.entries.map((e) => ({
        playerId: e.playerId,
        playerName: e.player.name,
        buyIn: e.buyIn,
        cashOut: e.cashOut,
        // The only signal the data carries about leaving early. Set exclusively by
        // the live path, which is why the departures summary reports its own
        // denominator rather than pretending every night is comparable.
        cashedOutEarly: e.cashedOutAt !== null,
      })),
      // RebuyEvent rows are the single source of truth for rebuys (F-07); nights
      // that recorded none get them reconstructed from the total buy-in, exactly as
      // insights and the banter pack already do. Never buy-in arithmetic.
      rebuyEvents: withDerivedRebuyEvents(s.entries, s.rebuyEvents, defaultBuyIn),
    }));

    // `dropEmpty: false` on purpose: `ordered.length` is the denominator for every
    // attendance rate, and a night only departed players attended still happened.
    // Per D-B night counts stay whole, so the row survives with no entries.
    const activeIds = new Set(roster.map((p) => p.id));
    return computeGroupAngles(groupId, filterRowsToActive(rows, activeIds, { dropEmpty: false }), roster);
  }
}

export const anglesService = new AnglesService();

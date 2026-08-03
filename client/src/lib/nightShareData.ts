import { getCurrencySymbol } from './nightMessage';
import { deriveBeltLine } from './beltLine';
import type { NightCardInput } from './shareCard';
import type { BeltLineage, NightTitle, Settlement } from '@/types';

/**
 * The single description of a poker night used by every share surface.
 *
 * Both the WhatsApp text and the image are built from this, so the two can never
 * disagree about who won, what the transfers were, or who holds the belt. It was
 * duplicated across SettlementView and SessionDetail before.
 */
export function buildNightShareInput(input: {
  date: string;
  currency?: string | null;
  entries: Array<{ playerId: string; playerName: string; profit: number }>;
  settlements: Settlement[];
  titles: NightTitle[];
  belt?: BeltLineage;
}): NightCardInput {
  const beltLine = deriveBeltLine({
    sessionDate: input.date,
    sessionPlayerIds: input.entries.map((e) => e.playerId),
    belt: input.belt,
  });

  return {
    date: input.date,
    currency: getCurrencySymbol(input.currency),
    results: input.entries.map((entry) => ({
      name: entry.playerName,
      profit: entry.profit,
      titles: input.titles.filter((t) => t.playerId === entry.playerId),
    })),
    settlements: input.settlements,
    belt: beltLine ? { line: beltLine } : undefined,
  };
}

/** Stable, human-readable filename for a night's card. */
export const nightCardFilename = (date: string) => `poker-night-${date.slice(0, 10)}.png`;

export interface BeltReignInput {
  playerId: string;
  playerName: string;
  fromDate: string;
  toDate: string | null;
  nightsHeld: number;
  defenses: number;
  takenFromPlayerName: string | null;
}

export interface BeltLineageInput {
  current: BeltReignInput | null;
  history: BeltReignInput[];
}

export interface BeltSegment {
  playerId: string;
  playerName: string;
  fromDate: string;
  toDate: string | null;
  nightsHeld: number;
  defenses: number;
  takenFromPlayerName: string | null;
  widthPercent: number;
}

/**
 * Flattens a belt lineage (oldest-first history + the ongoing current reign)
 * into left-to-right timeline segments, each width proportional to the
 * reign's nightsHeld share of the total. Widths sum to 100%.
 */
export const computeBeltSegments = (lineage: BeltLineageInput): BeltSegment[] => {
  const reigns = [...lineage.history, ...(lineage.current ? [lineage.current] : [])];
  const totalNights = reigns.reduce((sum, r) => sum + r.nightsHeld, 0);

  if (reigns.length === 0 || totalNights === 0) {
    return [];
  }

  return reigns.map((reign) => ({
    playerId: reign.playerId,
    playerName: reign.playerName,
    fromDate: reign.fromDate,
    toDate: reign.toDate,
    nightsHeld: reign.nightsHeld,
    defenses: reign.defenses,
    takenFromPlayerName: reign.takenFromPlayerName,
    widthPercent: (reign.nightsHeld / totalNights) * 100,
  }));
};

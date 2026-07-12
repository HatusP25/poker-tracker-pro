const UNSPECIFIED_LOCATION = 'Unspecified';

export interface LocationSessionInput {
  location: string | null | undefined;
  entries?: { buyIn: number }[];
}

export interface LocationStat {
  location: string;
  sessions: number;
  totalPot: number;
  avgPot: number;
}

/**
 * Aggregates sessions by location, grouping case-insensitively and trimming
 * whitespace. Sessions with an empty/null location are bucketed together as
 * "Unspecified". Results are sorted by total pot size, descending.
 */
export const aggregateProfitByLocation = (sessions: LocationSessionInput[]): LocationStat[] => {
  const buckets: Record<string, { display: string; sessions: number; totalPot: number }> = {};

  sessions.forEach((session) => {
    const rawLocation = (session.location || '').trim();
    const key = rawLocation.length > 0 ? rawLocation.toLowerCase() : UNSPECIFIED_LOCATION;
    const display = rawLocation.length > 0 ? rawLocation : UNSPECIFIED_LOCATION;
    const pot = session.entries?.reduce((sum, entry) => sum + entry.buyIn, 0) || 0;

    if (!buckets[key]) {
      buckets[key] = { display, sessions: 0, totalPot: 0 };
    }

    buckets[key].sessions += 1;
    buckets[key].totalPot += pot;
  });

  return Object.values(buckets)
    .map((bucket) => ({
      location: bucket.display,
      sessions: bucket.sessions,
      totalPot: Number(bucket.totalPot.toFixed(2)),
      avgPot: bucket.sessions > 0 ? Number((bucket.totalPot / bucket.sessions).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.totalPot - a.totalPot);
};

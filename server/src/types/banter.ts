// Banter Pack — shared type contract.
// Mirrored EXACTLY in client/src/types/index.ts (see docs/superpowers/plans/2026-07-12-banter-pack.md).

// ---- Night Titles ----
export type NightTitleId = 'shark' | 'donation' | 'atm' | 'houdini';

export interface NightTitle {
  id: NightTitleId;
  label: string;
  emoji: string;
  playerId: string;
  playerName: string;
}

// ---- The Belt ----
export interface BeltReign {
  playerId: string;
  playerName: string;
  fromDate: string; // ISO date of the session where the reign began
  toDate: string | null; // ISO date reign ended (session lost), null = current
  nightsHeld: number; // completed sessions from reign start through reign end (inclusive) in which the belt existed
  defenses: number; // nights the holder played and retained
  takenFromPlayerName: string | null; // null for the first champion
}

export interface BeltLineage {
  current: BeltReign | null;
  history: BeltReign[];
  totalTitleChanges: number;
}

// ---- Achievements ----
export type AchievementId =
  | 'hat-trick'
  | 'comeback-kid'
  | 'phoenix'
  | 'giant-slayer'
  | 'iron-man'
  | 'regular'
  | 'veteran'
  | 'rebuy-royalty'
  | 'double-up'
  | 'untouchable';

export interface EarnedAchievement {
  id: AchievementId;
  name: string;
  emoji: string;
  description: string;
  earnedAt: string;
  sessionId: string;
}

export interface PlayerAchievements {
  playerId: string;
  playerName: string;
  earned: EarnedAchievement[];
}

export interface AchievementsResponse {
  players: PlayerAchievements[];
  recentUnlocks: (EarnedAchievement & { playerId: string; playerName: string })[]; // newest first, cap 10
  catalog: { id: AchievementId; name: string; emoji: string; description: string }[]; // all 10, for greyed silhouettes
}

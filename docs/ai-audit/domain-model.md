# Domain Model

## Entity Relationship Diagram

```
┌─────────────┐
│    Group    │
│─────────────│
│ id (PK)     │
│ name        │
│ defaultBuyIn│
│ currency    │
│ userRole    │
└─────┬───────┘
      │ 1
      │
      ├──────────────┬──────────────┐
      │ *            │ *            │ *
┌─────▼───────┐ ┌────▼────┐ ┌──────▼────────┐
│   Player    │ │ Session │ │SessionTemplate│
│─────────────│ │─────────│ │───────────────│
│ id (PK)     │ │ id (PK) │ │ id (PK)       │
│ groupId(FK) │ │groupId  │ │ groupId (FK)  │
│ name        │ │ date    │ │ name          │
│ avatarUrl   │ │startTime│ │ location      │
│ isActive    │ │ endTime │ │ defaultTime   │
└──────┬──────┘ │location │ │ playerIds[]   │
       │        │ notes   │ └───────────────┘
       │        │photoUrls│
       │        │ status  │
       │        │deletedAt│
       │        │settle-  │
       │        │  ments  │
       │        └────┬────┘
       │             │
       │    ┌────────┴────────┐
       │    │                 │
       │    │ *               │ *
       │ ┌──▼───────────┐ ┌───▼──────────┐
       │ │ SessionEntry │ │ RebuyEvent   │
       │ │──────────────│ │──────────────│
       │ │ id (PK)      │ │ id (PK)      │
       │ │ sessionId(FK)│ │ sessionId(FK)│
       │ │ playerId(FK) │◄┤ playerId(FK) │
       │ │ buyIn        │ │ amount       │
       │ │ cashOut      │ └──────────────┘
       │ └──────────────┘
       │
       │ *
┌──────▼──────┐
│ PlayerNote  │
│─────────────│
│ id (PK)     │
│ playerId(FK)│
│ note        │
│ tags[]      │
└─────────────┘
```

## Core Entities

### Group
The top-level organizational unit representing a poker circle (e.g., "Friday Night Poker").

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| name | String | Group display name |
| defaultBuyIn | Float | Standard buy-in amount (default: 5.0) |
| currency | String | Currency code (default: USD) |
| userRole | String | "VIEWER" or "EDITOR" |

**Relations:** Has many Players, Sessions, SessionTemplates

### Player
A member of a poker group who participates in sessions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| groupId | String | Foreign key to Group |
| name | String | Player display name |
| avatarUrl | String? | Optional avatar image URL |
| isActive | Boolean | Soft active/inactive flag |

**Constraints:**
- Unique: (groupId, name) - no duplicate names within group

**Relations:** Has many SessionEntries, PlayerNotes, RebuyEvents

### Session
A poker game/night with multiple players.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| groupId | String | Foreign key to Group |
| date | DateTime | Date of session |
| startTime | String? | Start time (HH:MM) |
| endTime | String? | End time (HH:MM) |
| location | String? | Game location |
| notes | String? | Session notes |
| photoUrls | String? | JSON array of photo URLs |
| status | String | "IN_PROGRESS" or "COMPLETED" |
| settlements | String? | JSON array of settlement transactions |
| deletedAt | DateTime? | Soft delete timestamp |

**Relations:** Has many SessionEntries, RebuyEvents

### SessionEntry
An individual player's participation in a session.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| sessionId | String | Foreign key to Session |
| playerId | String | Foreign key to Player |
| buyIn | Float | Total buy-in (including rebuys) |
| cashOut | Float | Final cash-out amount |

**Constraints:**
- Unique: (sessionId, playerId) - one entry per player per session

**Computed Fields (not stored):**
- profit = cashOut - buyIn
- rebuys = (buyIn - defaultBuyIn) / defaultBuyIn

### RebuyEvent
Tracks individual rebuy events during live sessions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| sessionId | String | Foreign key to Session |
| playerId | String | Foreign key to Player |
| amount | Float | Rebuy amount |

### PlayerNote
Notes about player tendencies and strategies.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| playerId | String | Foreign key to Player |
| note | String | Note content |
| tags | String? | JSON array of tag strings |

### SessionTemplate
Saved session configurations for quick setup.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| groupId | String | Foreign key to Group |
| name | String | Template name |
| location | String? | Default location |
| defaultTime | String? | Default start time (HH:MM) |
| playerIds | String | JSON array of player IDs |

## Computed Domain Concepts

### PlayerStats
Aggregated statistics for a player (computed, not stored).

```typescript
interface PlayerStats {
  playerId: string;
  playerName: string;
  totalGames: number;
  winningGames: number;
  losingGames: number;
  breakEvenGames: number;
  totalBuyIn: number;
  totalCashOut: number;
  totalBalance: number;           // totalCashOut - totalBuyIn
  roi: number;                    // ((cashOut - buyIn) / buyIn) * 100
  winRate: number;                // (winningGames / totalGames) * 100
  avgProfit: number;              // totalBalance / totalGames
  avgBuyIn: number;               // totalBuyIn / totalGames
  cashOutRate: number;            // (totalCashOut / totalBuyIn) * 100
  rebuyRate: number;              // (totalRebuys / totalGames) * 100
  bestSession: number;            // Max single session profit
  worstSession: number;           // Min single session profit
  currentStreak: Streak;
  longestWinStreak: number;
  longestLossStreak: number;
  recentFormWinRate: number;      // Win rate of last 5 games
}
```

### LeaderboardEntry
Ranking data for a player.

```typescript
interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  isActive: boolean;
  games: number;
  balance: number;
  roi: number;
  winRate: number;
  bestWin: number;
  recentForm: number;             // Last 5 games win rate
  streak: Streak;
}
```

### Settlement
Post-game payment transaction.

```typescript
interface Settlement {
  from: string;    // Player ID (debtor)
  to: string;      // Player ID (creditor)
  amount: number;  // Payment amount
}
```

### SessionSummary
Detailed analysis of a session's impact.

```typescript
interface SessionSummary {
  sessionId: string;
  rankingChanges: RankingChange[];
  highlights: SessionHighlights;
  milestones: Milestone[];
}

interface RankingChange {
  playerId: string;
  playerName: string;
  oldRank: number;
  newRank: number;
  change: number;   // oldRank - newRank (positive = improvement)
}

interface SessionHighlights {
  biggestWinner: { playerId, playerName, profit };
  biggestLoser: { playerId, playerName, profit };
  mostRebuys: { playerId, playerName, rebuys };
  totalPot: number;
  avgBuyIn: number;
}
```

## Business Rules

### Zero-Sum Constraint
Total buy-ins MUST equal total cash-outs within a session.
```
sum(entries.buyIn) === sum(entries.cashOut)
```
- Tolerance: 0.01 for floating-point comparison
- Validated before settlement calculation

### Session Lifecycle

```
                    ┌─────────────┐
                    │  START      │
                    │ (Live Mode) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ IN_PROGRESS │◄───────┐
                    │             │        │
                    └──────┬──────┘        │
                           │ End Session   │ Reopen
                    ┌──────▼──────┐        │ (24h window)
                    │  COMPLETED  │────────┘
                    └──────┬──────┘
                           │ Delete
                    ┌──────▼──────┐
                    │   DELETED   │ (soft delete)
                    │ (30 day TTL)│
                    └──────┬──────┘
                           │ Restore
                           └──────────────►
```

### Streak Rules
- Win: profit > 0
- Loss: profit < 0
- Break-even: profit = 0 (breaks both streaks)

### Milestone Triggers
- Game milestones: 10, 25, 50, 100 games
- Profit milestones: First $50, $100, $250, $500
- Top 3 entry milestone
- Consecutive streak milestones: 2+ wins/losses

## Data Integrity

### Cascade Deletes
- Group deletion cascades to: Players, Sessions, Templates
- Player deletion cascades to: Entries, Notes, RebuyEvents
- Session deletion cascades to: Entries, RebuyEvents

### Soft Delete
- Sessions use soft delete (`deletedAt` timestamp)
- Recoverable within 30 days
- Excluded from all statistics queries

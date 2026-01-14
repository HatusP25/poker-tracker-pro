# 🛠️ Development Documentation - Poker Tracker Pro

Technical documentation for developers working on or extending Poker Tracker Pro.

**Last Updated**: January 9, 2026
**Version**: 1.0.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Documentation](#api-documentation)
4. [Statistics Calculations](#statistics-calculations)
5. [Frontend Architecture](#frontend-architecture)
6. [Component Structure](#component-structure)
7. [State Management](#state-management)
8. [Development Workflow](#development-workflow)
9. [Performance Considerations](#performance-considerations)
10. [Security](#security)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Port 5173)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │  React 18 + TypeScript + Vite                      │ │
│  │  - React Router v7 (routing)                       │ │
│  │  - TanStack Query (data fetching & caching)        │ │
│  │  - shadcn/ui + Tailwind CSS (UI)                   │ │
│  │  - Recharts (data visualization)                   │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/REST
                        │ (axios)
┌───────────────────────▼─────────────────────────────────┐
│                   SERVER (Port 3001)                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Express.js + TypeScript                           │ │
│  │  - RESTful API routes                              │ │
│  │  - Business logic in services                      │ │
│  │  - Prisma ORM for database access                  │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ Prisma Client
                        │
┌───────────────────────▼─────────────────────────────────┐
│                DATABASE (SQLite)                         │
│  poker.db - Local file-based database                   │
│  - Groups, Players, Sessions, Entries, Notes            │
└─────────────────────────────────────────────────────────┘
```

### Technology Choices

| Component | Technology | Reason |
|-----------|------------|--------|
| **Frontend Framework** | React 18 | Component reusability, large ecosystem |
| **Build Tool** | Vite | Lightning-fast HMR, modern ESM-based |
| **Type Safety** | TypeScript | Catch errors at compile time, better DX |
| **Data Fetching** | TanStack Query | Caching, optimistic updates, background refetch |
| **UI Library** | shadcn/ui | Customizable, accessible, type-safe |
| **Styling** | Tailwind CSS | Utility-first, rapid development |
| **Charts** | Recharts | React-native, responsive, composable |
| **Backend Framework** | Express.js | Minimal, flexible, well-documented |
| **ORM** | Prisma | Type-safe queries, migrations, excellent DX |
| **Database** | SQLite | Local-first, zero config, portable |

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    Group     │────────▶│   Player     │────────▶│ PlayerNote   │
│              │ 1     * │              │ 1     * │              │
│ - id         │         │ - id         │         │ - id         │
│ - name       │         │ - groupId    │         │ - playerId   │
│ - defaultBuyIn│         │ - name       │         │ - note       │
│ - currency   │         │ - avatarUrl  │         │ - tags       │
└──────┬───────┘         │ - isActive   │         └──────────────┘
       │                 └──────┬───────┘
       │ 1                      │ 1
       │                        │
       │ *                      │ *
┌──────▼───────┐         ┌──────▼───────┐
│   Session    │────────▶│SessionEntry  │
│              │ 1     * │              │
│ - id         │         │ - id         │
│ - groupId    │         │ - sessionId  │
│ - date       │         │ - playerId   │
│ - startTime  │         │ - buyIn      │
│ - endTime    │         │ - cashOut    │
│ - location   │         └──────────────┘
│ - notes      │
│ - photoUrls  │
└──────────────┘
```

### Detailed Schema

#### Group
```typescript
{
  id: string           // CUID primary key
  name: string         // Group name (e.g., "Friday Night Poker")
  defaultBuyIn: number // Default buy-in amount (e.g., 5.0)
  currency: string     // Currency code (e.g., "USD")
  createdAt: DateTime
  updatedAt: DateTime

  // Relations
  players: Player[]
  sessions: Session[]
}
```

**Constraints**:
- `id` is primary key
- `defaultBuyIn` defaults to 5.0
- `currency` defaults to "USD"

**Indexes**: None (small table)

---

#### Player
```typescript
{
  id: string           // CUID primary key
  groupId: string      // Foreign key to Group
  name: string         // Player name
  avatarUrl: string?   // Optional avatar image URL
  isActive: boolean    // Active status (default: true)
  createdAt: DateTime
  updatedAt: DateTime

  // Relations
  group: Group
  entries: SessionEntry[]
  notes: PlayerNote[]
}
```

**Constraints**:
- `id` is primary key
- `(groupId, name)` unique together
- `groupId` foreign key with CASCADE delete

**Indexes**:
- `[groupId]` - Fast group lookups
- `[groupId, isActive]` - Filter active players

---

#### Session
```typescript
{
  id: string           // CUID primary key
  groupId: string      // Foreign key to Group
  date: DateTime       // Session date
  startTime: string?   // Optional start time (e.g., "19:30")
  endTime: string?     // Optional end time (e.g., "23:45")
  location: string?    // Optional location
  notes: string?       // Optional session notes
  photoUrls: string?   // JSON array of photo URLs
  createdAt: DateTime
  updatedAt: DateTime

  // Relations
  group: Group
  entries: SessionEntry[]
}
```

**Constraints**:
- `id` is primary key
- `groupId` foreign key with CASCADE delete

**Indexes**:
- `[groupId, date]` - Fast session lookups and sorting

---

#### SessionEntry
```typescript
{
  id: string           // CUID primary key
  sessionId: string    // Foreign key to Session
  playerId: string     // Foreign key to Player
  buyIn: number        // Total buy-in (including rebuys)
  cashOut: number      // Cash-out amount
  createdAt: DateTime
  updatedAt: DateTime

  // Relations
  session: Session
  player: Player

  // Computed fields (not stored):
  // profit = cashOut - buyIn
  // rebuys = (buyIn - defaultBuyIn) / defaultBuyIn
}
```

**Constraints**:
- `id` is primary key
- `(sessionId, playerId)` unique together
- `sessionId` foreign key with CASCADE delete
- `playerId` foreign key with CASCADE delete

**Indexes**:
- `[sessionId]` - Fast entry lookups by session
- `[playerId]` - Fast entry lookups by player

---

#### PlayerNote
```typescript
{
  id: string           // CUID primary key
  playerId: string     // Foreign key to Player
  note: string         // Note content
  tags: string?        // JSON array of tags
  createdAt: DateTime
  updatedAt: DateTime

  // Relations
  player: Player
}
```

**Constraints**:
- `id` is primary key
- `playerId` foreign key with CASCADE delete

**Indexes**:
- `[playerId]` - Fast note lookups by player

---

## API Documentation

### Base URL
**Development**: `http://localhost:3001/api`

### Authentication
Currently none. Future: JWT tokens.

---

### Groups

#### `GET /groups`
Get all groups.

**Response**:
```json
[
  {
    "id": "cmk4oytdo000020ukbo2m4jgf",
    "name": "Friday Night Poker",
    "defaultBuyIn": 5,
    "currency": "USD",
    "createdAt": "2026-01-08T00:10:56.701Z",
    "updatedAt": "2026-01-08T00:10:56.701Z",
    "_count": {
      "players": 4,
      "sessions": 13
    }
  }
]
```

---

#### `GET /groups/:id`
Get a single group by ID.

**Response**:
```json
{
  "id": "cmk4oytdo000020ukbo2m4jgf",
  "name": "Friday Night Poker",
  "defaultBuyIn": 5,
  "currency": "USD",
  "createdAt": "2026-01-08T00:10:56.701Z",
  "updatedAt": "2026-01-08T00:10:56.701Z"
}
```

---

#### `POST /groups`
Create a new group.

**Request Body**:
```json
{
  "name": "Friday Night Poker",
  "defaultBuyIn": 5,
  "currency": "USD"
}
```

**Response**: Created group object (201)

---

#### `PUT /groups/:id`
Update a group.

**Request Body** (all fields optional):
```json
{
  "name": "Thursday Poker",
  "defaultBuyIn": 10,
  "currency": "EUR"
}
```

**Response**: Updated group object (200)

---

#### `DELETE /groups/:id`
Delete a group (cascades to players, sessions, entries).

**Response**: 204 No Content

---

### Players

#### `GET /players?groupId={id}&activeOnly={boolean}`
Get players for a group.

**Query Params**:
- `groupId` (required): Group ID
- `activeOnly` (optional): Filter to active players only

**Response**:
```json
[
  {
    "id": "cmk4oytdp000220ukbgh33ksk",
    "groupId": "cmk4oytdo000020ukbo2m4jgf",
    "name": "Lucho",
    "avatarUrl": null,
    "isActive": true,
    "createdAt": "2026-01-08T00:10:56.702Z",
    "updatedAt": "2026-01-08T00:10:56.702Z"
  }
]
```

---

#### `GET /players/:id`
Get a single player by ID (includes group info and entry count).

**Response**:
```json
{
  "id": "cmk4oytdp000220ukbgh33ksk",
  "groupId": "cmk4oytdo000020ukbo2m4jgf",
  "name": "Lucho",
  "avatarUrl": null,
  "isActive": true,
  "group": { /* group object */ },
  "_count": {
    "entries": 13,
    "notes": 1
  }
}
```

---

#### `POST /players`
Create a new player.

**Request Body**:
```json
{
  "groupId": "cmk4oytdo000020ukbo2m4jgf",
  "name": "New Player",
  "avatarUrl": "https://example.com/avatar.jpg" // optional
}
```

**Response**: Created player object (201)

---

#### `PUT /players/:id`
Update a player.

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "avatarUrl": "https://...",
  "isActive": false
}
```

**Response**: Updated player object (200)

---

#### `PUT /players/:id/toggle-active`
Toggle player active status.

**Response**: Updated player object (200)

---

#### `DELETE /players/:id`
Delete a player (cascades to entries and notes).

**Response**: 204 No Content

---

#### `GET /players/search?groupId={id}&q={query}`
Search players by name.

**Query Params**:
- `groupId` (required): Group ID
- `q` (required): Search query

**Response**: Array of matching players

---

### Sessions

#### `GET /sessions?groupId={id}&limit={number}`
Get sessions for a group.

**Query Params**:
- `groupId` (required): Group ID
- `limit` (optional): Limit number of sessions

**Response**:
```json
[
  {
    "id": "cmk4pam8t00019p2rtlr3872m",
    "groupId": "cmk4oytdo000020ukbo2m4jgf",
    "date": "2026-01-07T00:00:00.000Z",
    "startTime": "19:30",
    "endTime": "23:45",
    "location": "Mike's House",
    "notes": "Great night!",
    "photoUrls": null,
    "entries": [
      {
        "id": "...",
        "sessionId": "...",
        "playerId": "...",
        "buyIn": 10,
        "cashOut": 25,
        "player": { /* player object */ }
      }
    ]
  }
]
```

---

#### `GET /sessions/:id`
Get a single session by ID (includes entries with player data).

**Response**: Session object with nested entries

---

#### `POST /sessions`
Create a new session.

**Request Body**:
```json
{
  "groupId": "cmk4oytdo000020ukbo2m4jgf",
  "date": "2026-01-09T00:00:00.000Z",
  "startTime": "19:00",  // optional
  "endTime": "23:00",    // optional
  "location": "Home",    // optional
  "notes": "Fun game",   // optional
  "photoUrls": [],       // optional
  "entries": [
    {
      "playerId": "cmk4oytdp000220ukbgh33ksk",
      "buyIn": 10,
      "cashOut": 15
    }
  ]
}
```

**Response**: Created session object with entries (201)

---

#### `PUT /sessions/:id`
Update a session (does NOT update entries - use separate endpoint).

**Request Body** (all fields optional):
```json
{
  "date": "2026-01-09T00:00:00.000Z",
  "startTime": "20:00",
  "endTime": "00:00",
  "location": "New Location",
  "notes": "Updated notes",
  "photoUrls": ["https://..."]
}
```

**Response**: Updated session object (200)

---

#### `DELETE /sessions/:id`
Delete a session (cascades to entries).

**Response**: 204 No Content

---

### Statistics

#### `GET /stats/groups/:id/dashboard`
Get dashboard statistics for a group.

**Response**:
```json
{
  "totalSessions": 13,
  "totalPlayers": 4,
  "activePlayers": 4,
  "netGroupProfit": 10,
  "avgSessionSize": 34.23,
  "lastSessionDate": "2026-01-07T00:00:00.000Z",
  "topPlayers": [
    {
      "playerId": "...",
      "playerName": "Lucho",
      "balance": 126,
      "roi": 81.29,
      "totalGames": 13
    }
  ],
  "recentSessions": [
    {
      "sessionId": "...",
      "date": "2026-01-07T00:00:00.000Z",
      "playerCount": 2,
      "winner": "Lucho",
      "totalPot": 20
    }
  ]
}
```

---

#### `GET /stats/groups/:id/leaderboard`
Get ranked player statistics for a group.

**Response**:
```json
[
  {
    "rank": 1,
    "playerId": "cmk4oytdp000220ukbgh33ksk",
    "playerName": "Lucho",
    "totalGames": 13,
    "totalBuyIn": 155,
    "totalCashOut": 281,
    "balance": 126,
    "roi": 81.29,
    "winRate": 69.23,
    "avgProfit": 9.69,
    "bestSession": 45,
    "recentFormWinRate": 80,
    "currentStreak": {
      "type": "win",
      "count": 4
    },
    "isActive": true
  }
]
```

---

#### `GET /stats/players/:id/stats`
Get detailed statistics for a player.

**Response**:
```json
{
  "playerId": "cmk4oytdp000220ukbgh33ksk",
  "playerName": "Lucho",
  "totalGames": 13,
  "totalBuyIn": 155,
  "totalCashOut": 281,
  "balance": 126,
  "roi": 81.29,
  "winRate": 69.23,
  "avgProfit": 9.69,
  "avgBuyIn": 11.92,
  "cashOutRate": 181.29,
  "recentFormWinRate": 80,
  "rebuyRate": 138.46,
  "winningSessionsCount": 9,
  "losingSessionsCount": 3,
  "breakEvenSessionsCount": 1,
  "bestSession": 45,
  "worstSession": -5,
  "totalRebuys": 18,
  "currentStreak": {
    "type": "win",
    "count": 4
  },
  "longestWinStreak": 4,
  "longestLossStreak": 1
}
```

---

#### `GET /stats/players/:id/history`
Get session history for a player.

**Response**:
```json
[
  {
    "sessionId": "...",
    "date": "2026-01-07T00:00:00.000Z",
    "buyIn": 10,
    "cashOut": 25,
    "profit": 15,
    "roi": 150,
    "location": "Home",
    "playerCount": 3
  }
]
```

---

## Statistics Calculations

All statistics are calculated server-side in `/server/src/services/statsService.ts`.

### Player Statistics Formulas

#### Basic Metrics
```typescript
// Total profit/loss
balance = totalCashOut - totalBuyIn

// Return on Investment
roi = (balance / totalBuyIn) × 100

// Win Rate
winRate = (winningSessions / totalSessions) × 100
  where winningSessions = sessions with profit > 0

// Average Profit per Game
avgProfit = balance / totalGames
```

#### Advanced Metrics (Milestone 11)
```typescript
// Average Buy-In per Game
avgBuyIn = totalBuyIn / totalGames

// Cash-Out Rate (capital efficiency)
cashOutRate = (totalCashOut / totalBuyIn) × 100
  // >100% means profitable overall

// Recent Form (last 5 games win rate)
recentFormWinRate = (wins in last 5 games / min(5, totalGames)) × 100

// Rebuy Rate
totalRebuys = count of entries beyond first for each session
rebuyRate = (totalRebuys / totalGames) × 100

// Best/Worst Session
bestSession = max(profit across all sessions)
worstSession = min(profit across all sessions)
```

#### Streaks
```typescript
// Current Streak
currentStreak = {
  type: "win" | "loss" | "none",
  count: number
}
// Calculated by iterating sessions in chronological order
// from most recent, counting consecutive wins or losses

// Longest Streaks
longestWinStreak = max consecutive winning sessions
longestLossStreak = max consecutive losing sessions
```

### Group Statistics Formulas

```typescript
// Net Group Profit (zero-sum check)
netGroupProfit = sum(all player balances)
  // Should be ~0 for closed games (accounting for rounding)

// Average Session Size
avgSessionSize = totalBuyInsAcrossAllSessions / totalSessions
  // Average pot per game
```

### Calculation Performance

**Optimization**: All statistics are calculated on-demand but cached by TanStack Query on the frontend.

**Query Keys** for cache invalidation:
- `['stats', groupId]` - Group statistics
- `['stats', 'player', playerId]` - Player statistics
- Invalidated on: session create/update/delete, player update

---

## Frontend Architecture

### Routing Structure

```typescript
// Routes (React Router v7)
/                           → Redirect to /groups
/groups                     → GroupSelection page
/                           → AppLayout (requires selected group)
  ├── /                     → Dashboard
  ├── /entry                → DataEntry
  ├── /sessions             → Sessions (list)
  ├── /sessions/:id         → SessionDetail
  ├── /players              → Players (list)
  ├── /players/:id          → PlayerDetail
  ├── /rankings             → Rankings (leaderboard)
  └── /analytics            → Analytics (7 charts)
```

### Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
TanStack Query Mutation Hook (useMutation)
    ↓
API Call (axios)
    ↓
Backend Route Handler
    ↓
Service Layer (business logic)
    ↓
Prisma ORM
    ↓
SQLite Database
    ↓
Response bubbles back up
    ↓
Mutation onSuccess
    ↓
Query Cache Invalidation (queryClient.invalidateQueries)
    ↓
Automatic Re-fetch
    ↓
UI Update (React re-render)
    ↓
Toast Notification
```

---

## Component Structure

### Page Components (`/client/src/pages`)

- **Dashboard.tsx**: Overview with 4 stat cards, top players, recent sessions
- **DataEntry.tsx**: Form to create new sessions
- **Sessions.tsx**: Grid of session cards with filtering
- **SessionDetail.tsx**: Detailed session view with entry breakdown
- **Players.tsx**: Grid of player cards with search
- **PlayerDetail.tsx**: Detailed player stats with 8 metric cards and history
- **Rankings.tsx**: Sortable leaderboard table
- **Analytics.tsx**: 7 Recharts visualizations
- **GroupSelection.tsx**: Group picker/creator

### Layout Components (`/client/src/components/layout`)

- **AppLayout.tsx**: Main layout with navbar, outlet, command palette, keyboard shortcuts
- **NavBar.tsx**: Top navigation with group selector and page links

### UI Components (`/client/src/components/ui`)

shadcn/ui components (button, card, input, table, skeleton, etc.)

### Skeleton Components (`/client/src/components/skeletons`)

- **CardSkeleton.tsx**: Generic card loading state
- **SessionCardSkeleton.tsx**: Session card loading state
- **StatCardSkeleton.tsx**: Stat card loading state
- **TableSkeleton.tsx**: Table loading state

### Utility Components

- **CommandPalette.tsx**: Cmd+K navigation menu (cmdk)

---

## State Management

### Global State (React Context)

**GroupContext** (`/client/src/context/GroupContext.tsx`):
```typescript
{
  selectedGroup: Group | null
  selectGroup: (group: Group) => void
}
```

Stores currently selected group in localStorage.

### Server State (TanStack Query)

All server data managed with TanStack Query hooks:

**Groups**:
- `useGroups()` - All groups
- `useGroup(id)` - Single group
- `useCreateGroup()` - Mutation
- `useUpdateGroup()` - Mutation
- `useDeleteGroup()` - Mutation

**Players**:
- `usePlayersByGroup(groupId, activeOnly?)` - Group players
- `usePlayer(id)` - Single player
- `usePlayerStats(id)` - Player statistics
- `usePlayerHistory(id)` - Player session history
- `useSearchPlayers(groupId, query)` - Search
- `useCreatePlayer()` - Mutation
- `useUpdatePlayer()` - Mutation
- `useTogglePlayerActive()` - Mutation
- `useDeletePlayer()` - Mutation

**Sessions**:
- `useSessionsByGroup(groupId, limit?)` - Group sessions
- `useSession(id)` - Single session
- `useCreateSession()` - Mutation
- `useUpdateSession()` - Mutation
- `useDeleteSession()` - Mutation

**Stats**:
- `useDashboardStats(groupId)` - Dashboard data
- `useLeaderboard(groupId)` - Leaderboard data
- `useAnalyticsData(groupId)` - Analytics charts data

### Local UI State

Managed with `useState` in components (forms, modals, filters, sorting).

---

## Development Workflow

### Setting Up Development Environment

1. **Clone and Install**
```bash
git clone <repo>
cd pokerapp
npm install
```

2. **Set Up Database**
```bash
cd server
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # Optional sample data
cd ..
```

3. **Start Development Servers**
```bash
npm run dev
```

Opens:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/api/health

### Adding a New Feature

1. **Database Changes** (if needed):
```bash
cd server
# Edit prisma/schema.prisma
npx prisma migrate dev --name feature_name
npx prisma generate
```

2. **Backend** (if needed):
- Add types in `/server/src/types/index.ts`
- Add route in `/server/src/routes/`
- Add service logic in `/server/src/services/`

3. **Frontend**:
- Add types in `/client/src/types/index.ts`
- Create hook in `/client/src/hooks/`
- Create/update page in `/client/src/pages/`
- Add components in `/client/src/components/`

4. **Testing**:
- Manual testing via UI
- Check console for errors
- Verify calculations
- Test edge cases

### Code Style

- **TypeScript**: Strict mode, no `any` types
- **Naming**:
  - Components: PascalCase
  - Hooks: camelCase with `use` prefix
  - Files: Match component/hook name
- **Imports**: Organized (React, external, internal, types)
- **Comments**: Where logic is complex

---

## Performance Considerations

### Frontend Optimizations

1. **React Query Caching**: Automatic background refetch, stale-while-revalidate
2. **Query Key Structure**: Hierarchical keys enable granular invalidation
3. **Skeleton Loaders**: Perceived performance improvement
4. **Code Splitting**: React Router lazy loading (if implemented)
5. **Vite**: Fast HMR, optimized production builds

### Backend Optimizations

1. **Prisma Queries**: Select only needed fields, use `include` wisely
2. **Database Indexes**: On `groupId`, `playerId`, `sessionId`, `date`
3. **Calculation Caching**: Frontend caches via React Query
4. **Batch Operations**: Create sessions with entries in one transaction

### Database Optimization

1. **SQLite WAL Mode**: Better concurrency (default in Prisma)
2. **Foreign Key Indexes**: Automatic via Prisma
3. **Compound Indexes**: `[groupId, date]`, `[groupId, isActive]`
4. **LIMIT Queries**: Pagination support in session queries

---

## Security

### Current Security Measures

1. **SQL Injection**: Protected by Prisma ORM (parameterized queries)
2. **XSS**: React escapes by default
3. **CORS**: Configured in Express (`cors` middleware)
4. **Input Validation**: TypeScript types + Zod validation (forms)
5. **Cascade Deletes**: Proper foreign key constraints prevent orphans

### Future Security Enhancements

1. **Authentication**: JWT tokens for user login
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Prevent API abuse
4. **HTTPS**: Required in production
5. **Input Sanitization**: Additional server-side validation
6. **CSRF Protection**: For mutation requests
7. **Session Security**: Secure cookies, httpOnly flags

---

## Testing Strategy

### Current State
- Manual testing performed (see [TEST_RESULTS.md](./TEST_RESULTS.md))
- 150+ test cases executed and passed
- All calculations verified manually

### Future Automated Testing

#### Unit Tests (Jest/Vitest)
- `/server/src/services/statsService.ts` - All calculation functions
- `/client/src/hooks/` - Custom React hooks
- `/client/src/lib/` - Utility functions (CSV, API client)

#### Integration Tests
- API endpoints with supertest
- Database operations with test database

#### E2E Tests (Playwright/Cypress)
- User flows: Create group → Add players → Record session → View stats
- Chart rendering
- Keyboard shortcuts
- Responsive design

---

## Deployment

### Frontend (Static Site)

**Build**:
```bash
cd client
npm run build
# Outputs to client/dist/
```

**Deploy to**:
- Vercel (recommended)
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

**Environment Variables**: None needed (API URL hardcoded)

### Backend (Node.js Server)

**Build**:
```bash
cd server
npm run build
# Outputs to server/dist/
```

**Deploy to**:
- Railway (recommended)
- Render
- Heroku
- AWS EC2/ECS
- DigitalOcean App Platform

**Environment Variables**:
```env
DATABASE_URL="file:./prisma/data/poker.db"  # For SQLite
# or
DATABASE_URL="postgresql://user:pass@host:5432/db"  # For PostgreSQL in production
NODE_ENV=production
PORT=3001
CORS_ORIGIN="https://your-frontend.com"
```

### Database Migration to PostgreSQL (Production)

For production, consider PostgreSQL:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Run migrations:
```bash
npx prisma migrate dev
```

3. Deploy with DATABASE_URL pointing to hosted PostgreSQL (e.g., Supabase, Neon, Railway)

---

## API Versioning

**Current**: No versioning (v1 implicit)

**Future**: Prefix routes with `/api/v1/` for backward compatibility when v2 is introduced.

---

## Contributing Guidelines

1. **Branch Naming**: `feature/feature-name`, `bugfix/bug-name`
2. **Commits**: Conventional Commits (feat:, fix:, docs:, etc.)
3. **Pull Requests**: Include description, screenshots, test results
4. **Code Review**: At least one approval before merge
5. **Testing**: Manual testing required, automated tests preferred

---

## Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Recharts API](https://recharts.org)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router v7](https://reactrouter.com)

---

## Changelog

### v1.0.0 (January 9, 2026)
- Initial release
- 12/12 milestones complete
- Full testing and documentation

---

**Built with ❤️ by poker players, for poker players.**

For user-facing documentation, see [README.md](./README.md).
For test results, see [TEST_RESULTS.md](./TEST_RESULTS.md).

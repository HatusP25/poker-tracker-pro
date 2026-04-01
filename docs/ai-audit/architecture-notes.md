# Architecture Notes

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React 18 + Vite + TypeScript                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pages     │  │ Components  │  │   Hooks     │         │
│  │  (13 total) │  │  (~45 UI)   │  │ (React Q)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│           │              │               │                   │
│           └──────────────┼───────────────┘                   │
│                          ▼                                   │
│              ┌─────────────────────┐                        │
│              │     API Client      │                        │
│              │  (Axios + /api/*)   │                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ HTTP
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│  Express.js + TypeScript                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Routes    │→ │ Controllers │→ │  Services   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                           │                  │
│                                           ▼                  │
│                          ┌─────────────────────┐            │
│                          │   Prisma ORM        │            │
│                          │   (Singleton)       │            │
│                          └─────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ SQL
┌─────────────────────────────────────────────────────────────┐
│                       Database                               │
│  PostgreSQL (prod) / SQLite (dev)                           │
│  7 Tables: groups, players, sessions, session_entries,      │
│            rebuy_events, player_notes, session_templates    │
└─────────────────────────────────────────────────────────────┘
```

## Backend Architecture

### Layer Separation

1. **Routes** (`/server/src/routes/`)
   - Define HTTP endpoints
   - Minimal logic, delegate to controllers

2. **Controllers** (`/server/src/controllers/`)
   - Request/response handling
   - Input validation
   - Error handling

3. **Services** (`/server/src/services/`)
   - Business logic
   - Database operations via Prisma
   - Complex calculations

### Key Services

| Service | Responsibility |
|---------|---------------|
| `statsService` | Player statistics, leaderboard, trends |
| `sessionService` | CRUD for completed sessions |
| `liveSessionService` | Live session management, rebuys |
| `settlementService` | Debt minimization algorithm |
| `sessionSummaryService` | Rankings, highlights, milestones |
| `playerService` | Player CRUD operations |
| `groupService` | Group management |
| `templateService` | Session templates |
| `backupService` | Data export/import |

### Database Access

- **Singleton Pattern:** `prisma.ts` exports single PrismaClient instance
- **Graceful Shutdown:** SIGINT handler disconnects client
- **Connection Pooling:** Railway manages PostgreSQL connections

## Frontend Architecture

### State Management

1. **React Query** (Server State)
   - All API data fetching
   - Automatic caching (5 min stale time)
   - Refetch on window focus disabled
   - Query keys: `['players', groupId]`, `['sessions', groupId]`, etc.

2. **React Context** (Client State)
   - `GroupContext`: Selected poker group
   - `RoleContext`: VIEWER/EDITOR mode
   - Both persisted to localStorage

### Component Organization

```
components/
├── ui/           # Base shadcn/ui components
├── analytics/    # Chart components
├── dashboard/    # Dashboard-specific
├── filters/      # Player/Session filters
├── groups/       # Group management
├── import/       # CSV import
├── layout/       # AppLayout, NavBar
├── live/         # Live session components
├── players/      # Player management
├── session/      # Session display
├── sessions/     # Session form, entries
├── skeletons/    # Loading states
└── templates/    # Session templates
```

### Routing Structure

```
/groups                    # Group selection (no layout)
/                          # Dashboard
/entry                     # Data entry
/sessions                  # Session list
/sessions/:id              # Session detail
/players                   # Player list
/players/:id               # Player detail
/rankings                  # Leaderboard
/analytics                 # Analytics dashboard
/settings                  # Settings
/live/start                # Start live session
/live/:sessionId           # Live session view
/live/:sessionId/settlement # Settlement view
```

## Data Flow Patterns

### Session Creation (Traditional)
```
User → SessionForm → sessionsApi.create() →
  POST /api/sessions → sessionController →
  sessionService.createSession() → Prisma → DB
```

### Live Session Flow
```
1. Start: LiveSessionStart → POST /api/live-sessions
2. Rebuy: RebuyDialog → POST /api/live-sessions/:id/rebuy
3. Add Player: AddPlayerDialog → POST /api/live-sessions/:id/players
4. End: EndSessionDialog → PATCH /api/live-sessions/:id/end
5. View Settlement: SettlementView (reads session.settlements)
```

### Statistics Calculation
```
GET /api/stats/players/:playerId →
  statsService.getPlayerStats() →
    - Fetch all sessions for player (excluding deleted)
    - Calculate metrics per session
    - Aggregate totals, averages, streaks
    - Return PlayerStats object
```

## Security Considerations

### Production Headers
```typescript
// Added in production mode:
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### CORS Configuration
- Development: All origins allowed
- Production: Restricted to `CORS_ORIGIN` env var

### Input Validation
- Buy-in: 0 < value <= 1000
- Cash-out: 0 <= value <= 10000
- Date: Must be past (no future sessions)
- Players per session: Minimum 2

## Error Handling

### Backend
- Global error handler middleware
- Prisma errors caught and formatted
- HTTP status codes: 400 (validation), 404 (not found), 500 (server)

### Frontend
- React Query error states
- Toast notifications (Sonner)
- Loading skeletons for async states

## Performance Considerations

### Caching
- React Query: 5 min stale time
- No backend caching (stateless API)

### Database Indexes
```prisma
@@index([groupId])           // Players, Sessions, Templates
@@index([groupId, date])     // Sessions
@@index([groupId, status])   // Sessions
@@index([sessionId])         // Entries, RebuyEvents
@@index([playerId])          // Entries, Notes, RebuyEvents
```

### Optimizations
- Prisma singleton prevents connection exhaustion
- Soft delete avoids immediate data loss
- Batch imports use transactions

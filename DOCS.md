# Poker Tracker Pro - Project Documentation

**Last Updated**: February 9, 2026
**Version**: 2.0.0
**Status**: Production (Deployed on Railway)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current State](#current-state)
3. [Tech Stack](#tech-stack)
4. [Getting Started](#getting-started)
5. [Features](#features)
6. [Architecture](#architecture)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Statistics Calculations](#statistics-calculations)
10. [Deployment](#deployment)
11. [Future Features](#future-features)

---

## Project Overview

Poker Tracker Pro is a full-stack web application for tracking poker sessions, managing players, and analyzing performance statistics. Built for home game enthusiasts who want to keep detailed records of their poker sessions.

### Key Capabilities

- **Group Management**: Create and manage multiple poker groups with custom settings
- **Player Tracking**: Add players, track their stats, and manage active/inactive status
- **Live Session Mode**: Real-time session tracking with rebuy support and settlement calculations
- **Historical Sessions**: Record and review past poker sessions
- **Session Analytics**: Ranking changes, highlights, streaks, and milestones after each session
- **Comprehensive Statistics**: Deep analytics on player performance and group trends
- **Role-Based Access**: VIEWER (read-only) and EDITOR (full access) modes
- **CSV Import/Export**: Bulk data operations
- **Keyboard Shortcuts**: Vim-style navigation and command palette

---

## Current State

### Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Core Features (12 milestones) | ✅ Complete |
| Phase 2 | Pre-Deployment Hardening | ✅ Complete |
| Phase 3 | Feature Enhancements | ✅ Live Sessions Complete |

### Recent Features (Latest Session)

- **Session Summary Analytics** - Shows ranking changes, highlights, streaks, and milestones
  - Displayed on Settlement page after live sessions
  - Displayed on Session Detail page for historical sessions
- **Low-Stakes Optimization** - Profit milestones: $50, $100, $250, $500
- **Enhanced Seed Data** - 15 sessions with active streaks for testing

### Production Deployment

- **Platform**: Railway
- **Database**: PostgreSQL
- **URL**: `https://[your-app].railway.app`
- **Auto-deploy**: Enabled from GitHub main branch

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool and dev server |
| React Router v7 | Routing |
| TanStack Query | Data fetching and caching |
| shadcn/ui | Component library |
| Tailwind CSS | Styling |
| Recharts | Data visualization |
| cmdk | Command palette |
| sonner | Toast notifications |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20.x | Runtime |
| Express.js + TypeScript | API framework |
| Prisma ORM | Database access |
| PostgreSQL (prod) / SQLite (dev) | Database |

---

## Getting Started

### Prerequisites
- Node.js 20.17.0 or higher
- npm 6.14.18 or higher

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd pokerapp

# Install dependencies
npm install

# Set up the database
cd server
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # Optional: Load sample data
cd ..

# Start development servers
npm run dev
```

### Development URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

### Common Commands

```bash
# Development
npm run dev              # Start both servers
npm run dev:client       # Start frontend only
npm run dev:server       # Start backend only

# Database
npm run db:seed          # Re-seed database
npm run db:studio        # Open Prisma Studio GUI
npm run db:migrate       # Run migrations

# Build
npm run build            # Build both client and server
```

---

## Features

### Live Session Mode

Real-time poker session tracking:

1. **Start Session**: Select players, set initial buy-ins
2. **Track Rebuys**: Add rebuys during the game
3. **Add Players**: Late arrivals can join mid-game
4. **End Session**: Enter cash-outs, view settlements
5. **Settlement Calculator**: Minimizes number of transactions

### Session Summary Analytics

After each session (live or historical), view:

- **Ranking Changes**: How each player's position changed
- **Session Highlights**: Biggest winner, loser, most rebuys
- **Active Streaks**: Win/loss streaks (minimum 2 games)
- **Milestones**: Best session ever, total games (10/25/50/100), profit thresholds ($50/$100/$250/$500), first time top 3

### Statistics Dashboard

- Player leaderboards with sortable columns
- ROI, win rate, and streak tracking
- 7 interactive charts on Analytics page
- Individual player performance pages

### Role-Based Access Control

- **VIEWER Mode**: Read-only access, buttons hidden
- **EDITOR Mode**: Full access to create/edit/delete
- Toggle in Settings page

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + K | Open command palette |
| G + D | Go to Dashboard |
| G + E | Go to Data Entry |
| G + S | Go to Sessions |
| G + P | Go to Players |
| G + R | Go to Rankings |
| G + A | Go to Analytics |
| N + S | New Session |
| N + P | New Player |

### Soft Delete

Sessions moved to trash can be restored within 30 days.

---

## Architecture

### Project Structure

```
pokerapp/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── layout/        # AppLayout, NavBar
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── session/       # Session-related components
│   │   │   ├── live/          # Live session components
│   │   │   └── skeletons/     # Loading skeletons
│   │   ├── pages/             # Route pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities, API client
│   │   ├── context/           # React context providers
│   │   └── types/             # TypeScript types
│   └── package.json
│
├── server/                    # Backend Express application
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── controllers/       # Request controllers
│   │   ├── services/          # Business logic
│   │   │   ├── statsService.ts          # Statistics calculations
│   │   │   ├── sessionSummaryService.ts # Session analytics
│   │   │   ├── settlementService.ts     # Settlement calculations
│   │   │   └── liveSessionService.ts    # Live session logic
│   │   └── lib/               # Prisma client
│   └── prisma/
│       ├── schema.prisma      # Database schema
│       ├── migrations/        # Database migrations
│       └── seed.ts            # Sample data
│
└── package.json               # Root package with scripts
```

### Data Flow

```
User Action → React Component → TanStack Query Mutation
    → Axios API Call → Express Route → Controller
    → Service Layer → Prisma ORM → PostgreSQL
    ← Response flows back ←
    → Cache Invalidation → UI Update → Toast Notification
```

---

## API Reference

### Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://[your-app].railway.app/api`

### Endpoints

#### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups` | Get all groups |
| GET | `/groups/:id` | Get group by ID |
| POST | `/groups` | Create group |
| PATCH | `/groups/:id` | Update group |
| DELETE | `/groups/:id` | Delete group |

#### Players
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/players/groups/:groupId/players` | Get players by group |
| GET | `/players/:id` | Get player by ID |
| POST | `/players` | Create player |
| PATCH | `/players/:id` | Update player |
| PATCH | `/players/:id/toggle-active` | Toggle active status |
| DELETE | `/players/:id` | Delete player |

#### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sessions/groups/:groupId/sessions` | Get sessions by group |
| GET | `/sessions/:id` | Get session by ID |
| POST | `/sessions` | Create session |
| PATCH | `/sessions/:id` | Update session |
| DELETE | `/sessions/:id` | Soft delete session |
| PATCH | `/sessions/:id/restore` | Restore deleted session |

#### Live Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/live-sessions/start` | Start live session |
| POST | `/live-sessions/:id/rebuy` | Add rebuy |
| POST | `/live-sessions/:id/add-player` | Add player mid-game |
| GET | `/live-sessions/:id` | Get live session status |
| POST | `/live-sessions/:id/end` | End session with cash-outs |

#### Statistics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats/players/:id/stats` | Get player statistics |
| GET | `/stats/groups/:groupId/leaderboard` | Get leaderboard |
| GET | `/stats/groups/:groupId/dashboard` | Get dashboard stats |
| GET | `/stats/sessions/:sessionId/summary` | Get session summary analytics |

---

## Database Schema

### Models

#### Group
```prisma
model Group {
  id           String    @id @default(cuid())
  name         String
  defaultBuyIn Float     @default(5)
  currency     String    @default("USD")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  players      Player[]
  sessions     Session[]
}
```

#### Player
```prisma
model Player {
  id        String   @id @default(cuid())
  groupId   String
  name      String
  avatarUrl String?
  isActive  Boolean  @default(true)
  group     Group    @relation(...)
  entries   SessionEntry[]

  @@unique([groupId, name])
}
```

#### Session
```prisma
model Session {
  id          String    @id @default(cuid())
  groupId     String
  date        DateTime
  startTime   String?
  endTime     String?
  location    String?
  notes       String?
  status      String    @default("COMPLETED")  // IN_PROGRESS | COMPLETED
  deletedAt   DateTime?
  group       Group     @relation(...)
  entries     SessionEntry[]
}
```

#### SessionEntry
```prisma
model SessionEntry {
  id        String   @id @default(cuid())
  sessionId String
  playerId  String
  buyIn     Float
  cashOut   Float    @default(0)
  session   Session  @relation(...)
  player    Player   @relation(...)

  @@unique([sessionId, playerId])
}
```

---

## Statistics Calculations

All calculations in `/server/src/services/statsService.ts`:

### Player Metrics

| Metric | Formula |
|--------|---------|
| Balance | totalCashOut - totalBuyIn |
| ROI | (balance / totalBuyIn) × 100 |
| Win Rate | (wins / totalGames) × 100 |
| Avg Profit | balance / totalGames |
| Cash-Out Rate | (totalCashOut / totalBuyIn) × 100 |
| Rebuy Rate | (totalRebuys / totalGames) × 100 |
| Recent Form | wins in last 5 games / 5 × 100 |

### Session Summary Analytics

In `/server/src/services/sessionSummaryService.ts`:

- **Ranking Changes**: Compare rankings before/after session date
- **Highlights**: Biggest winner/loser, most rebuys (calculated as extra buy-ins)
- **Streaks**: Consecutive wins/losses (minimum 2 games to display)
- **Milestones**:
  - Best session ever
  - Games played: 10, 25, 50, 100
  - Profit thresholds: $50, $100, $250, $500
  - First time top 3

### Settlement Calculator

In `/server/src/services/settlementService.ts`:

Minimizes transactions using greedy algorithm:
1. Calculate each player's net balance (cashOut - buyIn)
2. Separate debtors (negative) and creditors (positive)
3. Match largest debts with largest credits
4. Continue until all balanced

---

## Deployment

### Railway Deployment

The app is deployed to Railway with PostgreSQL.

#### Environment Variables

```env
DATABASE_URL="postgresql://..."  # Railway provides this
PORT=3001
NODE_ENV=production
CORS_ORIGIN="https://[your-app].railway.app"
```

#### Deploy Process

1. Push to GitHub main branch
2. Railway auto-deploys
3. Runs build and migrations
4. App available at Railway URL

### Local to Production Migration

```bash
# Export from SQLite (local)
cd server
DATABASE_URL="file:./prisma/data/poker.db" npm run migrate:export

# Import to PostgreSQL (Railway)
DATABASE_URL="postgresql://..." npm run migrate:import
```

---

## Future Features

### High Priority
- [ ] Player vs Player Head-to-Head Stats
- [ ] Session Templates & Quick Start
- [ ] Settlement Payment Tracking (mark as paid/pending)
- [ ] Advanced Analytics Dashboard

### Medium Priority
- [ ] Achievement System (badges, unlockables)
- [ ] Photo Gallery per Session
- [ ] Player Notes & Tags
- [ ] Tournament Mode

### Nice to Have
- [ ] Export to PDF Reports
- [ ] Multi-Group Comparisons
- [ ] Smart Suggestions (AI insights)
- [ ] Real-time Sync (WebSockets)
- [ ] PWA (Progressive Web App)

---

## Development Guidelines

### Code Patterns

```typescript
// Components: Arrow functions
const ComponentName = () => {
  return <div>...</div>;
};

// Hooks: TanStack Query pattern
export const useEntity = (id: string) => {
  return useQuery({
    queryKey: ['entity', id],
    queryFn: () => api.get(id),
    enabled: !!id,
  });
};

// Mutations with cache invalidation
export const useCreateEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity'] });
      toast.success('Created successfully');
    },
  });
};
```

### Best Practices

1. **Always read files before editing** - Never modify code you haven't seen
2. **Check TypeScript build** - Run `npm run build` before committing
3. **Test edge cases** - Empty states, no data, error handling
4. **Keep it simple** - Don't over-engineer, add only what's needed
5. **Cache invalidation** - Always invalidate relevant queries after mutations

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**Database issues:**
```bash
cd server
npx prisma migrate reset  # WARNING: Deletes all data
npx prisma migrate dev
npx prisma db seed
```

**Node version issues:**
```bash
nvm use 20.17.0  # Use .nvmrc version
```

**Build errors:**
```bash
npm run build  # Check for TypeScript errors
```

---

## Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Railway Docs](https://docs.railway.app)

---

**Built with care for poker players, by poker players.**

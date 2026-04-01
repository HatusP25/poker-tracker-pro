# Project Overview

**Application:** Poker Tracker Pro
**Version:** 1.0.0 / 2.0.0
**Status:** Production (deployed on Railway)
**Last Updated:** 2026-03-17

## Summary

Poker Tracker Pro is a full-stack web application for tracking poker home games. It enables groups of players to record sessions, track individual performance over time, and analyze statistics including ROI, win rates, and streaks.

## Core Purpose

- Track poker sessions with buy-ins, cash-outs, and rebuys
- Calculate player statistics and rankings
- Support live session tracking with real-time updates
- Provide settlement calculations to minimize post-game transactions
- Enable multi-group support for different poker circles

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3, TypeScript 5.9, Vite 7.2 |
| UI | Tailwind CSS 3.4, shadcn/ui, Radix UI |
| State | React Query (TanStack Query 5.62) |
| Routing | React Router 7.1 |
| Charts | Recharts 2.15 |
| Backend | Express.js 4.21, TypeScript 5.7 |
| ORM | Prisma 5.22 |
| Database | PostgreSQL (production), SQLite (development) |
| Deployment | Docker, Railway.app |

## Project Structure

```
pokerapp/
├── client/          # React/Vite frontend
│   ├── src/
│   │   ├── pages/       # 13 page components
│   │   ├── components/  # ~45 UI components
│   │   ├── hooks/       # 8 React Query hooks
│   │   ├── context/     # Group + Role context
│   │   ├── lib/         # API client, utilities
│   │   └── types/       # TypeScript interfaces
│   └── vite.config.ts
├── server/          # Express backend
│   ├── src/
│   │   ├── routes/      # 7 route modules
│   │   ├── controllers/ # 7 controllers
│   │   ├── services/    # 9 service modules
│   │   ├── middleware/  # Error handler
│   │   ├── utils/       # Calculations, validators
│   │   └── lib/         # Prisma singleton
│   └── prisma/
│       └── schema.prisma
└── docs/            # Documentation
```

## Key Features

1. **Session Management** - Create, edit, delete (soft) sessions
2. **Live Session Tracking** - Real-time timer, rebuys, late arrivals
3. **Player Statistics** - ROI, win rate, streaks, rankings
4. **Settlement Calculator** - Greedy algorithm minimizing transactions
5. **Analytics Dashboard** - Charts, trends, comparisons
6. **Role-Based Access** - VIEWER (read-only) and EDITOR modes
7. **Data Import/Export** - CSV support for bulk operations
8. **Session Templates** - Save and reuse common configurations
9. **Multi-Group Support** - Separate groups for different poker circles

## Deployment

- **Platform:** Railway.app
- **Build:** Multi-stage Docker
- **Health Check:** `/api/health`
- **Auto-deploy:** GitHub main branch

## Development

```bash
npm run dev          # Start both servers
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

**Ports:**
- Frontend: 5173
- Backend: 3001

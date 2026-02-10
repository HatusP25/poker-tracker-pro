# Poker Tracker Pro

A comprehensive poker session tracking and analytics application for home game enthusiasts.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.17.0-brightgreen.svg)

---

## Features

- **Live Session Tracking**: Real-time game tracking with rebuy support
- **Session Analytics**: Ranking changes, highlights, streaks, and milestones
- **Settlement Calculator**: Minimizes transactions when settling up
- **Player Statistics**: ROI, win rate, streaks, and comprehensive metrics
- **7 Interactive Charts**: Profit trends, player comparisons, and more
- **Role-Based Access**: VIEWER (read-only) and EDITOR modes
- **Keyboard Shortcuts**: Vim-style navigation (G+D, G+S, etc.)
- **CSV Import/Export**: Bulk data operations
- **Soft Delete**: 30-day recovery window for deleted sessions

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
cd server && npx prisma generate && npx prisma migrate dev && cd ..

# Start development servers
npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript, Prisma ORM |
| Database | PostgreSQL (prod) / SQLite (dev) |
| Hosting | Railway |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + K | Command palette |
| G + D | Dashboard |
| G + S | Sessions |
| G + P | Players |
| G + R | Rankings |
| N + S | New Session |
| N + P | New Player |

---

## Documentation

See [DOCS.md](./DOCS.md) for:
- Complete API reference
- Database schema
- Statistics calculations
- Deployment guide
- Architecture details
- Development guidelines

---

## Project Structure

```
pokerapp/
├── client/          # React frontend
│   └── src/
│       ├── pages/       # Route pages
│       ├── components/  # UI components
│       ├── hooks/       # React Query hooks
│       └── lib/         # API client, utilities
│
├── server/          # Express backend
│   └── src/
│       ├── routes/      # API endpoints
│       ├── services/    # Business logic
│       └── prisma/      # Database schema
│
└── package.json     # Root scripts
```

---

## Commands

```bash
npm run dev          # Start both servers
npm run build        # Build for production
npm run db:seed      # Seed sample data
npm run db:studio    # Open Prisma Studio
```

---

## Deployment

Deployed on Railway with PostgreSQL. Auto-deploys from GitHub main branch.

---

## License

MIT License

---

**Built for poker players, by poker players.**

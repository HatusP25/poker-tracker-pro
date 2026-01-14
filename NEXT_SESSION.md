# 🚀 Quick Start Guide for Next Session

## Context at a Glance
- **Project:** Poker Tracker Pro (full-stack TypeScript web app)
- **Status:** Phase 1 - 36% Complete (4/11 milestones done)
- **What works:** Backend API, Database, Routing, Navigation, API integration
- **What's next:** Build UI features (forms, tables, charts)

---

## Start Development Immediately

```bash
cd /Users/hatuspellegrini/Documents/Personal/pokerapp

# Start both servers (one command)
npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001/api/health
```

---

## Next Milestone: #5 - Group & Player Management

### Goal
Build the group selection screen and player management UI.

### Tasks
1. ✅ Update GroupSelection page to show actual groups
2. ✅ Create "Create Group" dialog with form
3. ✅ Create Players page with table
4. ✅ Add Create/Edit/Delete player dialogs
5. ✅ Test everything works end-to-end

### Files to Create/Edit
```
/client/src/pages/GroupSelection.tsx         - Update to fetch real data
/client/src/components/groups/CreateGroupDialog.tsx   - NEW
/client/src/components/groups/GroupCard.tsx           - NEW
/client/src/pages/Players.tsx                - Update with real UI
/client/src/components/players/PlayerTable.tsx        - NEW
/client/src/components/players/CreatePlayerDialog.tsx - NEW
/client/src/components/players/EditPlayerDialog.tsx   - NEW
/client/src/hooks/usePlayers.ts              - NEW (like useGroups.ts)
```

### Example Hook Pattern
```typescript
// File: /client/src/hooks/usePlayers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playersApi } from '@/lib/api';

export const usePlayersByGroup = (groupId: string) => {
  return useQuery({
    queryKey: ['players', groupId],
    queryFn: async () => {
      const response = await playersApi.getByGroup(groupId);
      return response.data;
    },
    enabled: !!groupId,
  });
};

// Add useCreatePlayer, useUpdatePlayer, useDeletePlayer...
```

---

## Quick Reference

### Project Structure
```
pokerapp/
├── server/          # Backend (Express + Prisma)
│   ├── src/
│   │   ├── services/    # Business logic
│   │   ├── controllers/ # Request handlers
│   │   ├── routes/      # API endpoints
│   │   └── types/       # TypeScript types
│   └── prisma/
│       ├── schema.prisma    # Database schema
│       └── seed.ts          # Sample data
│
└── client/          # Frontend (React + Vite)
    └── src/
        ├── pages/           # Route pages
        ├── components/      # UI components
        ├── hooks/           # TanStack Query hooks
        ├── lib/
        │   └── api.ts       # API client
        └── context/
            └── GroupContext.tsx  # Selected group state
```

### Key Commands
```bash
npm run dev           # Start both servers
npm run db:seed       # Re-seed database
npm run db:studio     # View database GUI
```

### Current Database
- 1 group: "Friday Night Poker"
- 4 players: Lucho (+$116), Rauw (+$4), Muel (-$60), Hatus (-$50)
- 12 sessions (Oct 2025 - Jan 2026)
- 41 session entries

### API Already Working
- ✅ All group endpoints
- ✅ All player endpoints
- ✅ All session endpoints
- ✅ All stats endpoints

### Frontend Already Set Up
- ✅ React Router with 9 routes
- ✅ TanStack Query configured
- ✅ API client with all endpoints typed
- ✅ GroupContext for state
- ✅ NavBar with navigation
- ✅ Dark mode enabled
- ✅ shadcn/ui components (Button, Card, Input)

---

## What To Tell AI

**Option 1 - Continue from where we left off:**
```
"Let's continue building the Poker Tracker Pro app.
I want to start Milestone 5: Group & Player Management.
Please read PROGRESS.md to see what's done and build the group selection page first."
```

**Option 2 - Jump to specific feature:**
```
"Let's build the [feature name] for Poker Tracker Pro.
Context is in PROGRESS.md. I want to focus on [specific page/component]."
```

**Option 3 - See current state:**
```
"Show me the current state of Poker Tracker Pro.
Read PROGRESS.md and demonstrate the app working with screenshots/descriptions."
```

---

## Testing Checklist (Before Each Session Ends)

- [ ] `npm run dev` starts both servers without errors
- [ ] Frontend loads at http://localhost:5173
- [ ] Backend responds at http://localhost:3001/api/health
- [ ] No console errors in browser
- [ ] New features work as expected
- [ ] Database still has seed data

---

## Emergency Fixes

**Servers won't start:**
```bash
# Clean ports
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Reinstall dependencies (if needed)
npm run clean
npm run install:all
```

**Database issues:**
```bash
cd server
npx prisma migrate reset    # Resets and re-seeds
npx prisma generate          # Regenerate client
```

**Node version:**
```bash
nvm use     # Uses .nvmrc (20.17.0)
```

---

## Success Metrics for Phase 1

When you can do all this, Phase 1 is complete:

- [ ] Create a poker group
- [ ] Add 4 players
- [ ] Enter 10 sessions with real data
- [ ] View accurate leaderboard
- [ ] See player statistics
- [ ] View session history
- [ ] Export data to CSV
- [ ] Import data from CSV
- [ ] Use keyboard shortcuts for navigation
- [ ] All charts display correctly

**Current status:** 0/10 ✅ (Infrastructure ready!)

---

**Pro Tip:** The hard part (backend, calculations, architecture) is done!
Now it's just building forms, tables, and charts. Follow existing patterns and you'll be done quickly.

Good luck! 🎰🚀

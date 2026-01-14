# 🚀 PHASE 2: PRE-DEPLOYMENT HARDENING PLAN

**Start Date:** January 12, 2026
**Target Completion:** January 12, 2026 (4-6 hours)
**Status:** ✅ COMPLETE (5/5 Complete)

---

## 📊 PROGRESS TRACKER

| # | Task | Priority | Est. Time | Status | Actual Time |
|---|------|----------|-----------|--------|-------------|
| 1 | Fix Mobile Form Grid | CRITICAL | 30 min | ✅ COMPLETE | 15 min |
| 2 | Fix Number Validation | CRITICAL | 30 min | ✅ COMPLETE | 10 min |
| 3 | Add Database Backup | CRITICAL | 2 hours | ✅ COMPLETE | 1.5 hours |
| 4 | Fix Leaderboard Performance | HIGH | 1.5 hours | ✅ COMPLETE | 10 min |
| 5 | Add Soft Delete Sessions | HIGH | 1.5 hours | ✅ COMPLETE | 45 min |

**Total Estimated:** 5.5 hours
**Total Actual:** 2 hours 50 min
**Completion:** 100%

---

## 🎯 TASK DETAILS

### Task 1: Fix Mobile Form Grid ✅

**Priority:** CRITICAL
**Estimated Time:** 30 minutes
**Status:** COMPLETE
**Actual Time:** 15 minutes

**Problem:**
- SessionForm uses `grid-cols-12` which doesn't adapt to mobile screens
- Causes horizontal scrolling on phones
- Primary use case (data entry during poker games) is mobile

**Files to Change:**
- `/client/src/components/sessions/SessionForm.tsx` (line 228-235, 239-263)

**Changes Required:**
1. Update entry headers grid: `grid-cols-4 sm:grid-cols-8 lg:grid-cols-12`
2. Update entry row grid to match breakpoints
3. Adjust gap spacing: `gap-1 sm:gap-2`
4. Test on mobile viewport (375px width)

**Acceptance Criteria:**
- [ ] Form usable on iPhone SE (375px width)
- [ ] No horizontal scrolling on mobile
- [ ] All fields accessible without zooming
- [ ] Maintains desktop layout on larger screens

---

### Task 2: Fix Number Validation ✅

**Priority:** CRITICAL
**Estimated Time:** 30 minutes
**Status:** COMPLETE
**Actual Time:** 10 minutes

**Problem:**
- Can enter negative buy-ins/cash-outs
- Zero buy-ins allowed (breaks calculations)
- No unique constraint preventing duplicate players in same session

**Files to Change:**
1. `/server/src/utils/validators.ts`
2. `/server/prisma/schema.prisma`
3. Migration file (new)

**Changes Required:**

**A. Update validators.ts:**
```typescript
// Change line 14 (isValidBuyIn)
export const isValidBuyIn = (value: number): boolean => {
  return typeof value === 'number' && !isNaN(value) && value > 0; // Changed from >= 0
};

// Change line 18 (isValidCashOut)
export const isValidCashOut = (value: number): boolean => {
  return typeof value === 'number' && !isNaN(value) && value >= 0; // Keep >= 0 for cash-out
};
```

**B. Add unique constraint to schema.prisma:**
```prisma
model SessionEntry {
  // ... existing fields ...

  @@unique([sessionId, playerId]) // Add this constraint
}
```

**C. Create migration:**
```bash
cd server
npx prisma migrate dev --name add-unique-session-player-constraint
```

**Acceptance Criteria:**
- [ ] Cannot enter negative buy-in amounts
- [ ] Cannot enter zero buy-in amounts
- [ ] Can enter zero cash-out (for complete loss)
- [ ] Cannot add same player twice to a session (DB enforced)
- [ ] Migration runs successfully on production data

---

### Task 3: Add Database Backup ✅

**Priority:** CRITICAL
**Estimated Time:** 2 hours
**Status:** COMPLETE
**Actual Time:** 1.5 hours

**Problem:**
- No way to backup entire database
- Risk of data loss if database corrupted
- No disaster recovery plan

**Files to Create:**
1. `/server/src/routes/backup.ts` (new)
2. `/server/src/services/backupService.ts` (new)
3. `/server/src/controllers/backupController.ts` (new)

**Files to Modify:**
1. `/server/src/app.ts` (add backup route)
2. `/client/src/pages/Settings.tsx` (create if doesn't exist)
3. `/client/src/lib/api.ts` (add backup endpoints)

**API Endpoints to Create:**

**GET /api/backup/export**
- Exports entire database as JSON
- Returns: `{ groups: [], players: [], sessions: [], entries: [] }`
- Downloads as `poker-backup-YYYY-MM-DD.json`

**POST /api/backup/import**
- Accepts JSON backup file
- Validates structure
- Options:
  - `mode: 'merge' | 'replace'`
  - `skipDuplicates: boolean`
- Returns import report

**POST /api/backup/validate**
- Validates backup file without importing
- Returns: `{ valid: boolean, errors: [], warnings: [] }`

**Implementation Plan:**

**Step 1: Backend Service (1 hour)**
```typescript
// backupService.ts
export async function exportDatabase(prisma: PrismaClient) {
  const [groups, players, sessions, entries] = await Promise.all([
    prisma.group.findMany({ include: { _count: true } }),
    prisma.player.findMany(),
    prisma.session.findMany(),
    prisma.sessionEntry.findMany(),
  ]);

  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    data: { groups, players, sessions, entries }
  };
}

export async function importDatabase(prisma: PrismaClient, backup: BackupData, mode: 'merge' | 'replace') {
  // Implementation with transaction
}
```

**Step 2: Frontend UI (1 hour)**
- Add Settings page with Backup section
- Export button → downloads JSON file
- Import button → file upload with progress
- Validation preview before import

**Acceptance Criteria:**
- [ ] Can export full database to JSON
- [ ] Export includes all data (groups, players, sessions, entries)
- [ ] Can import backup file
- [ ] Import validates data before applying
- [ ] Import supports merge mode (keeps existing + adds new)
- [ ] Import supports replace mode (clears + imports)
- [ ] Duplicate detection prevents data corruption
- [ ] UI shows progress during import
- [ ] Success/error notifications displayed

---

### Task 4: Fix Leaderboard Performance ✅

**Priority:** HIGH
**Estimated Time:** 1.5 hours
**Status:** COMPLETE
**Actual Time:** 10 minutes

**Problem:**
- `getLeaderboard()` calls `getPlayerStats()` for each player in a loop
- N+1 query problem: 1 query for players + N queries for each player's stats
- Exponentially slow with many players (>50 players = >50 queries)

**File to Change:**
- `/server/src/services/statsService.ts` (line 140-207)

**Current Implementation (SLOW):**
```typescript
export async function getLeaderboard(groupId: string, minGames?: number) {
  const players = await prisma.player.findMany({
    where: { groupId, isActive: true },
  });

  const entries = await Promise.all(
    players.map(async (player) => {
      const stats = await getPlayerStats(player.id); // N+1 PROBLEM!
      return {
        playerId: player.id,
        playerName: player.name,
        ...stats,
      };
    })
  );
  // ...
}
```

**Optimized Implementation (FAST):**
```typescript
export async function getLeaderboard(groupId: string, minGames?: number) {
  // Single query to get all players with their entries
  const players = await prisma.player.findMany({
    where: { groupId, isActive: true },
    include: {
      entries: {
        include: {
          session: true,
        },
        orderBy: {
          session: { date: 'desc' },
        },
      },
    },
  });

  // Calculate stats in-memory (no additional queries)
  const entries = players.map((player) => {
    const stats = calculateStatsFromEntries(player.entries, groupId);
    return {
      playerId: player.id,
      playerName: player.name,
      ...stats,
    };
  });
  // ...
}
```

**New Helper Function:**
```typescript
function calculateStatsFromEntries(entries: PlayerEntry[], groupId: string) {
  // Calculate totalBuyIn, totalCashOut, balance, wins, etc.
  // (extracted from getPlayerStats logic)
}
```

**Acceptance Criteria:**
- [ ] Leaderboard loads in <500ms with 100 players
- [ ] Only 1-2 database queries total (not N+1)
- [ ] Stats calculations still accurate (verify with existing data)
- [ ] No breaking changes to API response format
- [ ] Performance improvement measurable (log query count before/after)

---

### Task 5: Add Soft Delete for Sessions ⏳

**Priority:** HIGH
**Estimated Time:** 1.5 hours
**Status:** PENDING

**Problem:**
- Session deletion is permanent and immediate
- No recovery option if user deletes by accident
- High risk for production data loss

**Files to Change:**
1. `/server/prisma/schema.prisma` (add deletedAt field)
2. `/server/src/services/sessionService.ts` (soft delete logic)
3. `/client/src/pages/Sessions.tsx` (show deleted sessions)
4. `/client/src/pages/SessionDetail.tsx` (add restore button)
5. New migration file

**Implementation Plan:**

**Step 1: Schema Update**
```prisma
model Session {
  // ... existing fields ...
  deletedAt DateTime? // New field

  // ... rest of model ...
}
```

**Step 2: Update sessionService.ts**
```typescript
// Modify deleteSession to set deletedAt instead of actual delete
export async function deleteSession(id: string) {
  return await prisma.session.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// Add new restoreSession function
export async function restoreSession(id: string) {
  return await prisma.session.update({
    where: { id },
    data: { deletedAt: null },
  });
}

// Update getSessionsByGroup to exclude deleted by default
export async function getSessionsByGroup(groupId: string, includeDeleted = false) {
  const where = includeDeleted
    ? { groupId }
    : { groupId, deletedAt: null };

  return await prisma.session.findMany({ where, /* ... */ });
}

// Add cleanup function for old deleted sessions
export async function permanentlyDeleteOldSessions() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return await prisma.session.deleteMany({
    where: {
      deletedAt: { lte: thirtyDaysAgo },
    },
  });
}
```

**Step 3: Frontend Changes**

**SessionDetail.tsx - Update delete button:**
```typescript
// Change delete text to indicate soft delete
{deleteSession.isPending ? 'Deleting...' : 'Move to Trash'}

// Add restore button (only show if session is deleted)
{session.deletedAt && (
  <Button onClick={handleRestore}>
    <RotateCcw className="h-4 w-4 mr-2" />
    Restore Session
  </Button>
)}
```

**Sessions.tsx - Add deleted sessions view:**
```typescript
// Add toggle to show/hide deleted sessions
<Tabs defaultValue="active">
  <TabsList>
    <TabsTrigger value="active">Active Sessions</TabsTrigger>
    <TabsTrigger value="deleted">Deleted (30 days)</TabsTrigger>
  </TabsList>
  <TabsContent value="active">
    {/* Current sessions list */}
  </TabsContent>
  <TabsContent value="deleted">
    {/* Show deleted sessions with restore buttons */}
  </TabsContent>
</Tabs>
```

**Step 4: API Routes**
```typescript
// Add restore endpoint
router.patch('/:id/restore', restoreSession);

// Add permanent delete endpoint (admin only)
router.delete('/:id/permanent', permanentlyDeleteSession);
```

**Acceptance Criteria:**
- [ ] Deleting session sets `deletedAt` timestamp (not permanent)
- [ ] Deleted sessions hidden from normal views
- [ ] Can view deleted sessions in "Trash" tab
- [ ] Can restore deleted sessions within 30 days
- [ ] Sessions auto-delete permanently after 30 days
- [ ] Deleted sessions excluded from stats calculations
- [ ] UI clearly indicates soft delete vs permanent delete
- [ ] Restore shows success toast
- [ ] Migration preserves existing data

---

## 🔍 TESTING CHECKLIST

After completing all tasks, verify:

### Mobile Testing
- [ ] Test on real iPhone (Safari)
- [ ] Test on real Android (Chrome)
- [ ] Test on iPad (Safari)
- [ ] Test session form on 375px viewport
- [ ] Test session form on 768px viewport
- [ ] Test session form on 1024px+ viewport

### Data Integrity Testing
- [ ] Try entering negative buy-in (should fail)
- [ ] Try entering zero buy-in (should fail)
- [ ] Try adding same player twice (should fail)
- [ ] Verify existing data still loads correctly
- [ ] Verify calculations still accurate after validation changes

### Backup Testing
- [ ] Export database successfully
- [ ] Exported JSON is valid
- [ ] Import exported backup (merge mode)
- [ ] Import exported backup (replace mode)
- [ ] Test import with invalid data (should reject)
- [ ] Verify data integrity after import

### Performance Testing
- [ ] Measure leaderboard load time before fix
- [ ] Measure leaderboard load time after fix
- [ ] Verify improvement >50% faster
- [ ] Check database query count (should be 1-2, not N+1)

### Soft Delete Testing
- [ ] Delete a session, verify it's hidden
- [ ] Check deleted session appears in trash
- [ ] Restore session, verify it reappears
- [ ] Verify stats exclude deleted sessions
- [ ] Test auto-cleanup of 30+ day old deletions

---

## 📝 DEPLOYMENT NOTES

**Before Deploying:**
1. ✅ Backup production database (using new backup feature!)
2. ✅ Run all migrations on staging first
3. ✅ Test all 5 features in staging environment
4. ✅ Verify no breaking changes to existing functionality
5. ✅ Update documentation with new features

**Database Migrations Order:**
1. Add `deletedAt` to Session model
2. Add unique constraint to SessionEntry
3. Run `npx prisma migrate deploy` on production

**Post-Deployment Verification:**
1. Test backup export on production
2. Verify leaderboard loads quickly
3. Test session creation on mobile device
4. Monitor error logs for validation failures
5. Check soft delete functionality

---

## 🚨 ROLLBACK PLAN

If critical issues arise after deployment:

**Step 1: Immediate Actions**
- Revert to previous deployment
- Restore database from backup (pre-Phase 2)

**Step 2: Database Rollback**
```bash
# Revert migrations
npx prisma migrate reset --skip-seed

# Restore from backup
node scripts/restore-backup.js backup-YYYY-MM-DD.json
```

**Step 3: Hotfix Plan**
- Identify failing task
- Mark as BLOCKED in this document
- Deploy remaining tasks only
- Fix blocked task in separate branch

---

**Document Version:** 1.0
**Last Updated:** January 12, 2026
**Next Review:** After each task completion

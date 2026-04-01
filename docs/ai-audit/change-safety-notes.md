# Change Safety Notes

## Safe Change Patterns

### Adding New Features

**Safe Approach:**
1. Add new files rather than modifying existing ones when possible
2. Add new API endpoints without changing existing ones
3. Add new database columns as optional (nullable)
4. Add new UI components in isolation
5. Use feature flags for gradual rollout (if needed)

### Modifying Existing Features

**Safe Approach:**
1. Read and understand the full file before editing
2. Make minimal, focused changes
3. Preserve existing behavior unless explicitly changing it
4. Add tests for modified behavior
5. Test edge cases (empty data, large data, null values)

### Database Changes

**Never:**
- Drop columns without migration strategy
- Rename columns directly (use add-copy-delete)
- Change column types without data migration
- Remove indexes without performance testing

**Always:**
- Add columns as nullable first
- Use multi-step migrations
- Test migrations on data copy
- Backup before deployment

## File Risk Levels

### Critical Files (HIGH RISK)

| File | Risk | Reason |
|------|------|--------|
| `server/prisma/schema.prisma` | HIGH | Database structure |
| `server/src/services/statsService.ts` | HIGH | Statistics calculations |
| `server/src/services/settlementService.ts` | HIGH | Payment calculations |
| `server/src/utils/calculations.ts` | HIGH | Core formulas |
| `server/src/lib/prisma.ts` | HIGH | Database connection |

### Important Files (MEDIUM RISK)

| File | Risk | Reason |
|------|------|--------|
| `server/src/services/sessionService.ts` | MEDIUM | Session CRUD |
| `server/src/services/liveSessionService.ts` | MEDIUM | Live sessions |
| `server/src/services/backupService.ts` | MEDIUM | Data import/export |
| `client/src/lib/api.ts` | MEDIUM | API client |
| `client/src/types/index.ts` | MEDIUM | Type definitions |

### Standard Files (LOW RISK)

| File | Risk | Reason |
|------|------|--------|
| UI components | LOW | Visual only |
| Routes (backend) | LOW | Routing only |
| Hooks (frontend) | LOW | React Query wrappers |
| Context files | LOW | State management |

## Change Validation

### Before Committing

1. **Type Check:** `npm run build` (both client and server)
2. **Manual Testing:** Core user flows
3. **Database Test:** Verify migrations work

### Core User Flows to Test

1. Create session with multiple players
2. Start and end live session
3. View player statistics
4. View leaderboard/rankings
5. Delete and restore session
6. Import CSV data

### Edge Cases to Verify

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty group (no sessions) | Dashboard shows zeros, no errors |
| Single player session | Rejected (minimum 2) |
| Zero profit session | Counted as break-even |
| Future date session | Rejected |
| Deleted session | Excluded from all stats |
| Large numbers | Displays correctly, no overflow |
| Floating point money | Rounded to 2 decimals |

## API Compatibility

### Breaking Changes (Avoid)

- Removing response fields
- Changing field types
- Changing endpoint paths
- Changing required parameters

### Non-Breaking Changes (Safe)

- Adding optional response fields
- Adding optional parameters
- Adding new endpoints
- Performance optimizations

## Statistics Formula Reference

**DO NOT MODIFY without extensive review:**

```typescript
// ROI
roi = ((totalCashOut - totalBuyIn) / totalBuyIn) * 100

// Win Rate
winRate = (winningGames / totalGames) * 100

// Average Profit
avgProfit = totalBalance / totalGames

// Cash-out Rate
cashOutRate = (totalCashOut / totalBuyIn) * 100

// Rebuy Count
rebuys = (buyIn - standardBuyIn) / standardBuyIn

// Profit
profit = cashOut - buyIn
```

## Rollback Strategy

### Immediate Rollback
```bash
git revert HEAD
git push origin main
```

### Staged Rollback
```bash
git log --oneline -10  # Find safe commit
git revert <bad-commit>
git push origin main
```

### Database Rollback

Prisma doesn't auto-generate down migrations. Options:

1. **Manual migration:** Write SQL to reverse changes
2. **Backup restore:** Use Railway backup (may lose recent data)
3. **Forward fix:** Create new migration to fix issues

## Proven Safe Patterns

### Navigation State for Pre-filling Forms (IMP-004)

When cloning/copying data to pre-fill a form, use React Router navigation state:

```typescript
// Source page (e.g., SessionDetail)
navigate('/entry', {
  state: {
    cloneFrom: {
      location: session.location,
      startTime: session.startTime,
      playerIds: session.entries?.map(e => e.playerId) || [],
    },
  },
});

// Target page (e.g., DataEntry)
const location = useLocation();
const cloneFrom = (location.state as LocationState | null)?.cloneFrom;

// Form component
useEffect(() => {
  if (cloneFrom) {
    reset({ ...defaultValues, ...cloneFrom });
    setEntries(cloneFrom.playerIds.map(...));
  }
}, [cloneFrom]);
```

**Why this is safe:**
- No backend changes required
- No database schema changes
- State is ephemeral (clears on refresh) - no persistence issues
- Follows existing patterns (similar to template loading)
- Fully reversible via git revert

## Communication

Before significant changes:
1. Notify stakeholders if user-facing
2. Document the change rationale
3. Plan for potential rollback
4. Monitor after deployment

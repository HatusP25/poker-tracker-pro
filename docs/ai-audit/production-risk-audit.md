# Production Risk Audit

## Current Status

**Application is live in production on Railway.app**

## Risk Categories

### HIGH RISK - Requires Extreme Caution

#### 1. Database Schema Changes
**Risk Level:** HIGH

Any Prisma schema modifications can cause:
- Migration failures in production
- Data loss during column drops
- Downtime during migrations
- Breaking changes to API responses

**Safe Approach:**
- Always add columns as optional first
- Never drop columns directly
- Use multi-step migrations for renames
- Test migrations against production data copy

#### 2. Statistics Calculation Logic
**Risk Level:** HIGH

Files: `server/src/services/statsService.ts`, `server/src/utils/calculations.ts`

Changes can cause:
- Incorrect player rankings
- Wrong ROI/win rate displays
- User trust issues with corrupted stats
- Historical data interpretation changes

**Safe Approach:**
- Add new metrics as separate fields
- Never modify existing calculation formulas without extensive testing
- Consider backwards compatibility for historical data

#### 3. Settlement Algorithm
**Risk Level:** HIGH

File: `server/src/services/settlementService.ts`

Incorrect settlements mean:
- Wrong payment instructions post-game
- Financial disputes between players
- Potential real-money implications

**Safe Approach:**
- Extensive unit testing with edge cases
- Never modify greedy algorithm without review
- Maintain zero-sum validation

### MEDIUM RISK - Proceed with Caution

#### 4. Session Entry CRUD
**Risk Level:** MEDIUM

Files: `server/src/services/sessionService.ts`, `server/src/services/liveSessionService.ts`

Issues can cause:
- Lost session data
- Corrupted entries
- Broken session-player relationships

**Safe Approach:**
- Maintain transactional integrity
- Preserve soft delete behavior
- Test cascade operations

#### 5. Data Import/Export
**Risk Level:** MEDIUM

Files: `server/src/services/backupService.ts`, `client/src/lib/import.ts`

Issues can cause:
- Data corruption during import
- Loss of existing data in replace mode
- Duplicate records

**Safe Approach:**
- Always backup before import
- Test with production data samples
- Maintain transactional imports

#### 6. API Response Formats
**Risk Level:** MEDIUM

Any response shape changes can:
- Break frontend displays
- Cause TypeScript type mismatches
- Create runtime errors

**Safe Approach:**
- Never remove fields from responses
- Add new fields as optional
- Version API if major changes needed

### LOW RISK - Standard Precautions

#### 7. UI Component Changes
**Risk Level:** LOW

Visual changes are generally safe but consider:
- Mobile responsiveness
- Loading state handling
- Error state handling

#### 8. New Feature Additions
**Risk Level:** LOW

Adding new features is safe if:
- Existing features remain untouched
- New endpoints don't conflict
- Database changes are additive only

## Production Environment

### Database
- **Type:** PostgreSQL (Railway-managed)
- **Connection:** Single DATABASE_URL
- **Backups:** Railway automatic backups
- **Pooling:** Railway connection management

### Deployment
- **Platform:** Railway.app
- **Build:** Docker multi-stage
- **Auto-deploy:** GitHub main branch
- **Health Check:** `/api/health`

### Monitoring
- **Logs:** Railway dashboard
- **Health:** Automated endpoint checks
- **Errors:** Express error middleware

## Pre-Change Checklist

Before any code change:

1. [ ] Review this risk audit
2. [ ] Identify affected services
3. [ ] Check for database schema impacts
4. [ ] Verify API response compatibility
5. [ ] Consider statistics calculation impact
6. [ ] Plan rollback strategy
7. [ ] Test with production-like data

## Rollback Procedures

### Code Rollback
```bash
git revert <commit-sha>
git push origin main
# Railway auto-deploys
```

### Database Rollback
- Prisma migrations are not auto-reversible
- Require manual DOWN migration
- May need Railway backup restore

### Emergency Contacts
- Railway Status: status.railway.app
- GitHub Issues: Project issue tracker

## Known Production Issues

*No known issues at time of audit.*

## Audit History

| Date | Auditor | Notes |
|------|---------|-------|
| 2026-03-17 | Claude Code | Initial discovery audit |

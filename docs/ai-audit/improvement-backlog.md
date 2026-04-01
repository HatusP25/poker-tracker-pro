# Improvement Backlog

## Backlog Items

### High Priority

#### IMP-001: Add Profit by Location Analytics
**Type:** Feature
**Effort:** Low
**Risk:** Low
**Description:** Analyze player performance by session location to identify profitable venues.
**Implementation:**
- Add location aggregation to statsService
- Add chart component for location breakdown
- Display in Analytics page

#### IMP-002: Add Profit by Day of Week Analytics
**Type:** Feature
**Effort:** Low
**Risk:** Low
**Description:** Track which days of the week are most profitable.
**Implementation:**
- Extract day from session date
- Aggregate stats by day
- Add visualization

#### IMP-003: Surface Player Notes in UI
**Type:** Feature
**Effort:** Low
**Risk:** Low
**Description:** Player notes exist in schema but aren't visible in PlayerDetail page.
**Implementation:**
- Add notes section to PlayerDetail
- Add create/edit/delete note dialogs
- Display tags as badges

#### IMP-004: Add Session Clone Feature ✅ IMPLEMENTED
**Type:** Feature
**Effort:** Low
**Risk:** Low
**Status:** Completed (2026-03-17)
**Description:** Copy existing session as template for quick entry.
**Implementation:**
- Added "Clone" button to SessionDetail page
- Navigation state passes session data to DataEntry
- SessionForm pre-fills with location, startTime, and players
- Date set to today, cash-outs reset to 0

#### IMP-005: Add Unit Tests for Statistics Service
**Type:** Technical Debt
**Effort:** Medium
**Risk:** Low
**Description:** Critical calculations lack test coverage.
**Implementation:**
- Add Jest setup to server
- Test statsService functions
- Test calculations.ts
- Test settlementService

### Medium Priority

#### IMP-006: Add Calendar Heatmap View
**Type:** Feature
**Effort:** Medium
**Risk:** Low
**Description:** Visual calendar showing session frequency and profit.
**Implementation:**
- Add calendar library (react-calendar-heatmap)
- Map sessions to calendar data
- Color by profit (green/red)

#### IMP-007: Add Player Head-to-Head Stats
**Type:** Feature
**Effort:** Medium
**Risk:** Low
**Description:** Compare two players' performance in shared sessions.
**Implementation:**
- Add endpoint for shared session query
- Calculate head-to-head metrics
- Add comparison UI

#### IMP-008: Add Undo/Edit Rebuy in Live Session
**Type:** Feature
**Effort:** Medium
**Risk:** Low
**Description:** Allow correction of accidental rebuy entries.
**Implementation:**
- Add edit/delete endpoints for RebuyEvent
- Update live session UI
- Recalculate buy-in on change

#### IMP-009: Add Request Rate Limiting
**Type:** Security
**Effort:** Low
**Risk:** Low
**Description:** Protect API from abuse.
**Implementation:**
- Add express-rate-limit middleware
- Configure sensible limits
- Add rate limit headers

#### IMP-010: Add API Documentation
**Type:** Technical Debt
**Effort:** Medium
**Risk:** Low
**Description:** Document API endpoints for maintainability.
**Implementation:**
- Add Swagger/OpenAPI annotations
- Generate API docs
- Host on /api/docs

### Low Priority

#### IMP-011: Add Authentication System
**Type:** Feature
**Effort:** High
**Risk:** Medium
**Description:** Enable multi-user access with login.
**Implementation:**
- Add User model
- Add auth routes (register, login, logout)
- Add JWT/session middleware
- Update all queries for user context

#### IMP-012: Add Game Variant Tracking
**Type:** Feature
**Effort:** Medium
**Risk:** Low
**Description:** Track different poker variants (Hold'em, Omaha, etc.)
**Implementation:**
- Add gameVariant field to Session
- Add variant selector in forms
- Add analytics by variant

#### IMP-013: Add Variance/Risk Metrics
**Type:** Feature
**Effort:** Medium
**Risk:** Low
**Description:** Calculate statistical variance for risk assessment.
**Implementation:**
- Calculate standard deviation of profits
- Add risk indicator to player stats
- Visualize variance over time

#### IMP-014: Mobile PWA Optimization
**Type:** Enhancement
**Effort:** Medium
**Risk:** Low
**Description:** Optimize for mobile with PWA features.
**Implementation:**
- Add service worker
- Add manifest.json
- Optimize touch interactions
- Test on mobile devices

#### IMP-015: Add CI/CD Pipeline
**Type:** Technical Debt
**Effort:** Low
**Risk:** Low
**Description:** Automated testing and deployment checks.
**Implementation:**
- Add GitHub Actions workflow
- Run type checks and tests
- Block merge on failure

### Future Consideration

#### IMP-016: Hand History Tracking
**Type:** Feature
**Effort:** High
**Risk:** Medium
**Description:** Record notable hands per session.
**Notes:** Requires new schema, complex UI

#### IMP-017: AI-Powered Insights
**Type:** Feature
**Effort:** High
**Risk:** Medium
**Description:** Automated analysis and recommendations.
**Notes:** Requires ML/AI integration

#### IMP-018: Push Notifications
**Type:** Feature
**Effort:** High
**Risk:** Low
**Description:** Notify users of milestones, reminders.
**Notes:** Requires push service setup

## Backlog Metrics

| Priority | Count | Estimated Effort |
|----------|-------|------------------|
| High | 5 | ~1-2 weeks |
| Medium | 5 | ~2-3 weeks |
| Low | 5 | ~3-4 weeks |
| Future | 3 | TBD |

## Selection Criteria

When selecting items to implement:

1. **User Value:** Does it improve the poker tracking experience?
2. **Risk Level:** Can it break existing functionality?
3. **Effort:** Is it proportionate to the value?
4. **Dependencies:** Does it require other changes first?
5. **Production Safety:** Can it be safely deployed?

## Change Log

| Date | Action | Items |
|------|--------|-------|
| 2026-03-17 | Created | Initial backlog from gap analysis |
| 2026-03-17 | Implemented | IMP-004 Session Clone Feature |

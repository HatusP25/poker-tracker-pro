# Open Questions

## Architecture Questions

### Q1: What is the expected scale?
**Status:** Open
**Context:** Need to understand growth expectations for caching/optimization decisions.
**Questions:**
- How many groups are expected?
- How many players per group?
- How many sessions per month?
- What's the retention period for data?

### Q2: Is multi-user/authentication planned?
**Status:** Open
**Context:** Current architecture is single-user with role toggle.
**Questions:**
- Should multiple users access the same group?
- Is login/registration needed?
- How should permissions work across users?

### Q3: What is the backup/recovery strategy?
**Status:** Partially Addressed
**Context:** JSON export exists but no automated backups.
**Questions:**
- How often should backups run?
- Where should backups be stored?
- What's the RTO/RPO expectation?

## Feature Questions

### Q4: Should player notes be surfaced?
**Status:** Open
**Context:** PlayerNote model exists but no UI to view/edit.
**Questions:**
- Where should notes appear?
- Who can edit notes?
- Are notes for strategy or general?

### Q5: Is game variant tracking needed?
**Status:** Open
**Context:** No way to track Texas Hold'em vs Omaha vs other games.
**Questions:**
- What variants should be supported?
- Should stats be separate per variant?
- How detailed should variant tracking be?

### Q6: Should sessions support photos?
**Status:** Open
**Context:** Schema has photoUrls field but no upload UI.
**Questions:**
- Where should photos be uploaded?
- How should they be displayed?
- What's the storage strategy?

## Technical Questions

### Q7: What testing approach is preferred?
**Status:** Open
**Context:** No tests currently exist.
**Questions:**
- Unit tests only or integration too?
- What coverage target?
- Should E2E tests be added?

### Q8: Should API versioning be implemented?
**Status:** Open
**Context:** No API versioning currently.
**Questions:**
- Is backwards compatibility important?
- What versioning scheme?
- How to handle deprecation?

### Q9: What monitoring/alerting is needed?
**Status:** Open
**Context:** Only basic Railway logs available.
**Questions:**
- What metrics should be tracked?
- What alerts are needed?
- Is error tracking service needed?

## Business Questions

### Q10: What's the monetization model?
**Status:** Open
**Context:** Currently free/open source.
**Questions:**
- Should there be premium features?
- Is SaaS model planned?
- Any enterprise considerations?

### Q11: Who is the target audience?
**Status:** Assumed
**Context:** Home game poker players.
**Questions:**
- Casual or serious players?
- Individual or group focus?
- Any professional use cases?

## Resolved Questions

### Q-R1: How should sessions be deleted?
**Status:** Resolved
**Resolution:** Soft delete with 30-day recovery window
**Date:** 2026-03-17

### Q-R2: How should streaks be calculated?
**Status:** Resolved
**Resolution:** Break-even sessions break both win and loss streaks
**Date:** 2026-03-17

### Q-R3: What should happen when settling?
**Status:** Resolved
**Resolution:** Greedy algorithm minimizes transaction count
**Date:** 2026-03-17

## Question Template

```markdown
### Q#: [Question Title]
**Status:** Open | In Discussion | Resolved
**Context:** [Background information]
**Questions:**
- [Specific question 1]
- [Specific question 2]
**Resolution:** (if resolved)
**Date:** (if resolved)
```

## Log

| Date | Question | Action |
|------|----------|--------|
| 2026-03-17 | Q1-Q11 | Created during initial audit |
| 2026-03-17 | Q-R1, Q-R2, Q-R3 | Marked resolved based on code review |

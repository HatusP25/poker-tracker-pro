# Improvement Roadmap

## Overview

This roadmap prioritizes improvements based on user value, risk level, and implementation effort. All changes follow the production safety guidelines in `change-safety-notes.md`.

## Phase 1: Analytics Enhancements (Low Risk)

**Goal:** Enhance analytics without modifying core data structures.

### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| IMP-001 | Profit by Location Analytics | Not Started |
| IMP-002 | Profit by Day of Week Analytics | Not Started |
| IMP-006 | Calendar Heatmap View | Not Started |

### Scope

- New analytics queries in statsService
- New chart components
- No database changes
- No API breaking changes

### Success Criteria

- Users can identify profitable locations
- Users can see play patterns over time
- No regression in existing features

---

## Phase 2: Quality & Safety (Foundation)

**Goal:** Establish testing and security foundations.

### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| IMP-005 | Unit Tests for Statistics Service | Not Started |
| IMP-009 | Request Rate Limiting | Not Started |
| IMP-015 | CI/CD Pipeline | Not Started |

### Scope

- Jest test setup
- Express rate limiting middleware
- GitHub Actions workflow

### Success Criteria

- Core calculation functions have test coverage
- API protected from abuse
- Automated checks before deploy

---

## Phase 3: UX Improvements (User Value)

**Goal:** Improve daily user experience.

### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| IMP-003 | Surface Player Notes in UI | Not Started |
| IMP-004 | Session Clone Feature | Not Started |
| IMP-008 | Undo/Edit Rebuy in Live Session | Not Started |

### Scope

- PlayerDetail page enhancements
- Session form improvements
- Live session editing

### Success Criteria

- Player notes accessible in UI
- Quick session duplication
- Rebuy mistakes correctable

---

## Phase 4: Advanced Analytics (Deeper Insights)

**Goal:** Provide more sophisticated analysis.

### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| IMP-007 | Player Head-to-Head Stats | Not Started |
| IMP-013 | Variance/Risk Metrics | Not Started |

### Scope

- New comparison algorithms
- Statistical calculations
- New visualizations

### Success Criteria

- Players can compare performance
- Risk metrics visible
- No calculation errors

---

## Phase 5: Documentation & Polish

**Goal:** Improve maintainability and onboarding.

### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| IMP-010 | API Documentation | Not Started |
| IMP-014 | Mobile PWA Optimization | Not Started |

### Scope

- OpenAPI/Swagger docs
- PWA manifest
- Mobile UX improvements

### Success Criteria

- API fully documented
- App installable on mobile
- Touch-friendly interface

---

## Future Phases (Requires Planning)

### Phase 6: Multi-User Support

| Item | Description |
|------|-------------|
| IMP-011 | Authentication System |

**Considerations:**
- Major architectural change
- Requires database migration
- All queries need user context
- Session security implementation

### Phase 7: Game Variants

| Item | Description |
|------|-------------|
| IMP-012 | Game Variant Tracking |

**Considerations:**
- Schema addition (optional field)
- Analytics per variant
- UI for variant selection

### Phase 8: Advanced Features

| Item | Description |
|------|-------------|
| IMP-016 | Hand History Tracking |
| IMP-017 | AI-Powered Insights |
| IMP-018 | Push Notifications |

**Considerations:**
- Complex implementations
- Require significant design work
- May need external services

---

## Timeline Overview

```
Phase 1: Analytics       ████░░░░░░ (Low Risk)
Phase 2: Quality         ████░░░░░░ (Foundation)
Phase 3: UX              ██████░░░░ (User Value)
Phase 4: Advanced        ████████░░ (Deeper Insights)
Phase 5: Documentation   ██████████ (Polish)
Future: Multi-User       ░░░░░░░░░░ (Planning Required)
```

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-17 | Start with analytics | Low risk, high user value |
| 2026-03-17 | Defer authentication | Major architectural change, needs design |
| 2026-03-17 | Prioritize tests | Foundation for safe changes |

## Review Schedule

- After each phase: Review outcomes, adjust priorities
- Monthly: Check roadmap relevance
- Quarterly: Major planning review

## Notes

- All changes must follow `change-safety-notes.md`
- Database changes require migration planning
- User-facing changes should be announced
- Rollback plan required for each deployment

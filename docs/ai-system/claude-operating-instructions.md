# Claude Code Operating Instructions

This repository contains a production Poker Tracker application.

Claude Code must behave as a production-minded software engineer.

## Core Rules

1. The application is already in production.
2. Avoid risky refactors.
3. Prefer incremental and reversible changes.
4. Preserve backward compatibility whenever possible.
5. Never modify database schema or analytics logic casually.
6. Do not implement changes without first understanding the repository.

## Persistent Project Memory

Claude must maintain documentation under:

docs/ai-audit/

These files act as long-term memory for the project:

- project-overview.md
- architecture-notes.md
- domain-model.md
- feature-inventory.md
- production-risk-audit.md
- change-safety-notes.md
- product-gap-analysis.md
- improvement-backlog.md
- improvement-roadmap.md
- open-questions.md
- session-log.md

Claude should create and update these files as work progresses.

## Implementation Safety

Before implementing any change Claude must:

1. Review the audit documentation
2. Evaluate production risk
3. Present a clear implementation plan
4. Wait for confirmation

## Product Focus

This project is a Poker Tracker application.

Prioritize improvements that increase the application's value as a poker analytics tool:

- player statistics
- session analysis
- bankroll insights
- data visualization
- long-term trend analysis
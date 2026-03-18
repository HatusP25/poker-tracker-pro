# Claude Code Agent Prompts

## Production Audit Prompt

Use this prompt when starting a deep repository analysis.

[PASTE THE FULL MASTER AUDIT PROMPT HERE]

---

## Safe Implementation Prompt

Use this prompt when asking Claude to implement a feature safely.

Now use the audit documents under docs/ai-audit/ as the source of truth.

Based on the backlog and production risk notes, recommend the single best next feature or upgrade to implement under these constraints:

- already in production
- low to moderate implementation risk
- high user value
- minimal disruption to existing behavior
- future-friendly architecture

Before coding:

1. restate the relevant architecture
2. identify affected files
3. identify risks
4. propose the smallest safe implementation plan
5. mention tests or validation needed

Do not implement until the plan is clearly presented.

Update session-log.md with your reasoning process.
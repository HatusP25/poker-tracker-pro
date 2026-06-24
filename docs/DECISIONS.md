# Decision Log

Standing product and architecture decisions. Append a new entry when a decision is made or
reversed; don't silently contradict an existing one — supersede it explicitly. Agents should read
this before proposing features so we don't re-litigate settled calls.

Format: `D-NNN — Title (date, status)` then Context / Decision / Consequences.

---

## D-001 — This is a home-game app, not a debt tracker (2026-06-19, accepted)

**Context:** When exploring feature gaps, a cross-session "who owes whom" ledger (carrying unsettled
balances between nights, payment status over time) looked high-value on paper.

**Decision:** Rejected as a product direction. The app is a *fun, social home poker game app* for a
recurring friend group. It is explicitly **not** a debt/collections tracker. Per-session settlement
calculation stays; an optional *per-session* paid/pending status is acceptable (see BACKLOG P1), but
balances do **not** persist across sessions into a running ledger.

**Consequences:** Backlog and Insights are framed around story/bragging-rights, not money owed.
Don't add cross-session debt features without reversing this entry.

---

## D-002 — No grinder/bankroll metrics ($/hour, variance) (2026-06-19, accepted)

**Context:** `startTime`/`endTime` are captured, so $/hour, hourly win rate, and variance/std-dev
were natural "performance analytics" candidates.

**Decision:** Rejected. These are serious-poker/bankroll-management metrics that don't resonate with a
casual home game. The user explicitly disliked the $/hour direction.

**Consequences:** "Performance analytics" for this app means social/competitive storylines (records,
rivalries, form, season recap), not efficiency metrics. Time fields remain stored but unused for $/hr.

---

## D-003 — Insights is a separate area from Analytics (2026-06-19, accepted)

**Context:** The four Insights modules could have been bolted onto the existing `/analytics` page.

**Decision:** Built a dedicated `/insights` area instead. `/analytics` is the *data toolbox* (filter,
compare, drill into numbers); `/insights` is the *story* (records, rivalries, momentum, recap).

**Consequences:** Existing Analytics charts were left untouched. Insights modules are independent,
read-only cards under `client/src/components/insights/`. New chart styling lives in a shared layer
intended to be reusable by Analytics later if desired.

---

## D-004 — Insights is additive & derived; no schema changes (2026-06-19, accepted)

**Context:** Records/rivalries/form/season could have introduced new tables (e.g. stored badges).

**Decision:** All Insights data is computed on read from existing models (`Session`, `SessionEntry`,
`RebuyEvent`, `Player`). No migrations; nothing touches money/settlement logic.

**Consequences:** Zero deployment/data risk for the feature. Computations are pure functions over
fetched rows (`insightsService.ts`), unit-testable without a DB. If a future feature needs persistence
(e.g. stored achievements), that's a new decision.

---

## D-005 — Deployment & workflow discipline (pre-existing, documented 2026-06-19)

**Context:** `main` auto-deploys to Railway production on push.

**Decision:** Never work on `main`; always branch. The full suite (unit + integration + e2e +
typecheck) must be green before any merge/push. Pushing `main` is a production deploy and requires
user confirmation.

**Consequences:** Codified in [CLAUDE.md](../CLAUDE.md) §2. CI enforces the suite on every PR/push.

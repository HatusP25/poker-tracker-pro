# Implementation Plan — Wave 0: Data Safety (F-01 · F-02 · F-03)

Spec: [`docs/superpowers/specs/2026-07-30-feature-roadmap.md`](../specs/2026-07-30-feature-roadmap.md) (Wave 0)
Analysis: [`docs/ai-audit/2026-07-30-codebase-analysis.md`](../../ai-audit/2026-07-30-codebase-analysis.md) §3.1, §3.2

**Goal.** Remove the two ways the app can currently destroy historical poker data: a lossy,
unscoped `replace` restore, and an unauthenticated public API that can trigger it.

**Hard constraint.** No production data is read, written or migrated by this work. No Prisma
migration. All changes are to backup/restore code paths, one new middleware, and the Settings UI.

---

## Task 1 — `requireApiKey` middleware (F-03)

**Red.** `server/src/middleware/requireApiKey.test.ts`:
- `API_KEY` unset → `next()` called, no status set (dev/local unaffected)
- `API_KEY` set, `GET` → `next()` (reads stay open; the risk is mutation)
- `API_KEY` set, `POST` without header → 401, `next()` not called
- `API_KEY` set, `POST` with wrong key → 401
- `API_KEY` set, `POST` with correct key → `next()`
- comparison is length-safe and constant-time-ish (no early-exit on first byte)

**Green.** `server/src/middleware/requireApiKey.ts`. Reads `process.env.API_KEY` **per request**,
not at module load, so tests and deploys can toggle it without a restart.

**Wire.** `app.ts`, after the rate limiter, before the route mounts. Log a single startup warning
when `API_KEY` is unset in `NODE_ENV=production`.

**Client.** `client/src/lib/api.ts` sets `X-Api-Key` from `import.meta.env.VITE_API_KEY` when present.

**Integration.** `server/tests/integration/apiKey.test.ts` — set/restore `process.env.API_KEY`
around the cases; assert 401 on `POST /api/backup/import` without a key and 2xx/4xx-not-401 with one.

**Rollout note (goes in the commit body and SECURITY.md).** Deploy with `API_KEY` unset first,
confirm the client is sending the header, *then* set the env var. Setting it before the client
knows the key locks the operator out of their own app.

---

## Task 2 — Backup export fidelity + scoping (F-01, F-02)

**Red.** `server/tests/integration/backup.test.ts`:
- export of a seeded group returns all seven models, with `rebuyEvents`, `playerNotes` and
  `templates` populated
- exported sessions carry `status`, `settlements`, `completedAt`, `deletedAt`
- `exportDatabase(groupId)` returns only that group's rows; a second group is absent
- `exportDatabase()` (no arg) still returns everything
- `version` is `2.0.0` and `scope.groupIds` lists the covered groups

**Green.** Rewrite `exportDatabase(groupId?)` in `backupService.ts`. Add
`GET /api/backup/export/:groupId` alongside the existing `GET /api/backup/export`.

---

## Task 3 — `validateBackup` v1/v2 awareness (F-01)

**Red.** `server/src/services/backupService.test.ts` (new unit file — `validateBackup` is pure):
- v2 file missing `rebuyEvents` → error
- v1 file (`version: "1.0.0"`) → **valid**, with warnings naming exactly what cannot be restored
  (rebuy events, player notes, templates, settlements, session status, deletion state)
- unknown/missing version → error, as today
- existing orphan/empty-array warnings still fire

**Green.** Extend `validateBackup` with a version branch. Export a pure
`collectBackupGroupIds(backup)` helper here too (used by Task 4) with its own tests:
empty groups, single group, dedupe against `scope.groupIds`.

---

## Task 4 — Import fidelity + scoped replace (F-01, F-02)

**Red.** `server/tests/integration/backup.test.ts`:
- **round trip**: seed group A (sessions incl. a soft-deleted one, rebuys, notes, templates,
  settlements) → export → wipe → import → every model and every session field matches the original
- **scoped replace**: two groups; replace-restore a group-A backup; **group B is untouched**
- **soft deletes stay deleted**: a `deletedAt` session round-trips as still deleted
- **v1 import**: a v1 file imports without crashing and does not delete what it cannot restore
- `merge` + `skipDuplicates` behaviour unchanged

**Green.** Rewrite `importDatabase`:
- `replace` deletes only within `collectBackupGroupIds(backup)`, children first
- import order: groups → players → sessions → entries → rebuyEvents → playerNotes → templates
- session create/update carries `status`, `settlements`, `completedAt`, `deletedAt`
- group create/update carries `userRole`
- a **v1 file is refused in `replace` mode** — it cannot restore what the delete would remove.
  Merge is still allowed.

---

## Task 5 — Settings UI fence (F-02)

- Replace mode requires typing the exact group name (or `ALL GROUPS` for an unscoped restore)
  before the file picker is enabled.
- The replace warning states plainly what will be deleted and that it is scoped to the backup's groups.
- E2E: extend `e2e/` with a check that the replace confirmation gates the input.

---

## Task 6 — Docs

`CHANGELOG.md`, `docs/WORKLOG.md`, `docs/SECURITY.md` (supersede F-06's "accepted" status),
`DOCS.md` (backup API + format v2), `.env.production.example` (`API_KEY`), `BACKLOG.md`
(drop the three P0 items).

---

## Verification

Full suite per CLAUDE.md §5, on the branch and again on the merged result:

```
cd server && npm test
cd server && npm run test:integration
cd client && npx tsc --noEmit
cd client && npm test
npm run test:e2e
```

Do not push. Merge to `main` only on the user's word; `main` auto-deploys to production.

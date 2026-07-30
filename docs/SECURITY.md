# Security Notes & Trust Model

## Current trust model (updated 2026-07-30)

Poker Tracker Pro is deployed as a **single-tenant, trusted-operator** application. There is no
user authentication; the VIEWER/EDITOR distinction (`client/src/context/RoleContext.tsx`) is a
**client-side UI convenience only** and is stored in `localStorage`.

Since 2026-07-30, **mutating requests are gated by a shared secret** (see F-06 below). That is a
deployment gate, not an identity system: it stops anonymous internet traffic from reaching
destructive endpoints. It does not distinguish between users, and it does not make VIEWER/EDITOR
enforceable.

### F-06 — Role enforcement is client-side only (partially mitigated 2026-07-30)

The server performs **no per-user authorization**. Any client holding the API key can call any
mutating endpoint regardless of the role shown in the UI.

**What changed.** The original framing accepted this on the grounds that the app is shared only
with trusted members of a home poker group and holds no sensitive personal data. That reasoning
held for the *read* surface. It did not hold for mutation: the app auto-deploys to a public
Railway domain, and `CORS_ORIGIN` constrains browsers but not `curl`. `POST /api/backup/import`
with `mode: "replace"` was therefore an **unauthenticated remote-wipe primitive on the open
internet** — anyone who learned the URL could delete the group's entire history.

`server/src/middleware/requireApiKey.ts` now closes that. It is deliberately minimal:

- Gates `POST`/`PATCH`/`PUT`/`DELETE` on `/api`; `GET`/`HEAD`/`OPTIONS` stay open, because names
  and game results are not sensitive and destructive mutation is the actual risk.
- Compares `X-Api-Key` against `process.env.API_KEY` in constant time, without leaking length.
- Reads `API_KEY` **per request**, so the key can be rotated without a restart.
- **No-op when `API_KEY` is unset**, so local dev and CI are unaffected. The server logs a loud
  warning at startup if it is unset in `NODE_ENV=production`.

**What it is not.** No `User` model, no login, no sessions, no per-user scoping. If this app is
ever offered to a group outside the friend circle, the full authentication epic (`IMP-011`) is
still required:

- a `User` model and auth (session or JWT) middleware,
- server-side `requireRole('EDITOR')` guards on every mutating route,
- scoping all queries to the authenticated user's groups.

### Deploying the API key

The **same** value must be set on both sides, and the order matters:

1. Deploy with `API_KEY` **unset** on the server, and `VITE_API_KEY` set in the client build.
2. Confirm the deployed client is sending the `X-Api-Key` header.
3. **Then** set `API_KEY` on the server to the same value.

Setting `API_KEY` before the client knows it will lock the operator out of their own app — every
write returns 401. Generate a key with `openssl rand -hex 32`.

## Data-destruction safety

Backup/restore is the only code path that can delete large amounts of history at once. As of
2026-07-30:

- **`replace` is scoped.** It deletes only rows belonging to groups named in the backup file.
  Previously it ran `deleteMany({})` and wiped *every* group in the database regardless of the
  file's contents.
- **`replace` is refused for version 1 backups**, which cannot restore the rebuy events, notes,
  templates, settlements and deletion state that the delete would remove.
- **`replace` is refused for backups naming no groups**, which have no scope to delete within.
- **Backups are lossless.** Format v2 covers all seven models and every session lifecycle field
  (`status`, `settlements`, `completedAt`, `deletedAt`), so a restore reproduces a group exactly
  — including which sessions were soft-deleted. A round-trip integration test
  (`server/tests/integration/backup.test.ts`) is the regression net.
- **The UI names the blast radius.** A replace opens a dialog listing the exact groups that will
  be deleted and requires the user to type the group name (or `REPLACE ALL`) before proceeding.

## Hardening already in place

- `helmet` security headers on all responses (CSP intentionally disabled — see `app.ts`).
- Explicit CORS allow-list via `CORS_ORIGIN`; no credentialed wildcard.
- `express-rate-limit` on `/api` (default 300 req/min/IP, `RATE_LIMIT_MAX` to override).
- Shared-secret gate on mutating requests via `API_KEY`.
- Request body size capped at 1 MB.
- Input validation on all session/live-session money fields (rejects negative/NaN/over-max).
- Zero-sum validation before any settlement is persisted.
- Error handler hides internal details and stack traces in production.

## Recommended next steps (tracked in BACKLOG.md)

- Consider a Content-Security-Policy now that the deployment posture is being taken seriously.
- Auth epic (`IMP-011`) only if multi-user is ever actually required — see the rejection note in
  [BACKLOG.md](../BACKLOG.md).

# Security Notes & Trust Model

## Current trust model (as of 2026-06-12)

Poker Tracker Pro is deployed as a **single-tenant, trusted-operator** application. There is no
user authentication; the VIEWER/EDITOR distinction (`client/src/context/RoleContext.tsx`) is a
**client-side UI convenience only** and is stored in `localStorage`.

### F-06 — Role enforcement is client-side only (accepted, documented)

The server performs **no authorization checks**. Any client that can reach the API can call any
mutating endpoint regardless of the role shown in the UI. This is **acceptable under the current
trust model** (the app is shared only with trusted members of a home poker group, and contains no
sensitive personal data beyond names and game results).

It is **not** acceptable for any multi-user / public deployment. Closing this gap is the
authentication epic (`IMP-011`) and requires:

- a `User` model and auth (session or JWT) middleware,
- server-side `requireRole('EDITOR')` guards on every mutating route,
- scoping all queries to the authenticated user's groups.

Until that epic lands, **do not expose this deployment to untrusted networks** without a
network-level gate (VPN, IP allow-list, or an auth proxy in front of Railway).

## Hardening already in place

- `helmet` security headers on all responses (CSP intentionally disabled — see `app.ts`).
- Explicit CORS allow-list via `CORS_ORIGIN`; no credentialed wildcard.
- `express-rate-limit` on `/api` (default 300 req/min/IP, `RATE_LIMIT_MAX` to override).
- Request body size capped at 1 MB.
- Input validation on all session/live-session money fields (rejects negative/NaN/over-max).
- Error handler hides internal details and stack traces in production.

## Recommended next steps (tracked in BACKLOG.md)

- PH-10: fix the `reopenSession` 24h window timestamp.
- Auth epic (IMP-011) when multi-user is required.

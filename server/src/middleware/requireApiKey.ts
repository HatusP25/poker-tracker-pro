import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * Shared-secret gate for mutating requests.
 *
 * This is deliberately NOT authentication (there is no User model, no login, and
 * VIEWER/EDITOR remains a client-side convenience). It is a lock on the front
 * door: the app is served from a public Railway domain and the server performs no
 * authorization, so without this, `POST /api/backup/import` with `mode: "replace"`
 * is an unauthenticated remote-wipe primitive. CORS does not help — it constrains
 * browsers, not `curl`.
 *
 * Reads are left open: names and game results are not sensitive, and the risk this
 * closes is destructive mutation. Only non-idempotent verbs are gated.
 *
 * `API_KEY` is read per request rather than captured at module load so the key can
 * be rotated (and toggled in tests) without a process restart.
 *
 * When `API_KEY` is unset the middleware is a no-op, so local development and the
 * existing test suites are unaffected. `logApiKeyStatus()` warns at startup if that
 * is the case in production.
 */

const OPEN_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Constant-time compare that doesn't leak length via early return. */
const secretsMatch = (provided: string, expected: string): boolean => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still burn a comparison so a length mismatch isn't measurably faster.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
};

export const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.API_KEY;

  // Not configured -> open. Intentional: keeps dev/CI frictionless.
  if (!expected) {
    next();
    return;
  }

  if (OPEN_METHODS.has(req.method)) {
    next();
    return;
  }

  const provided = req.get('X-Api-Key');

  if (!provided || !secretsMatch(provided, expected)) {
    // Never echo the expected key, the provided key, or the reason for failure.
    res.status(401).json({
      error: 'Unauthorized',
      message: 'A valid X-Api-Key header is required for this request.',
    });
    return;
  }

  next();
};

/**
 * Emit a one-time startup warning when the gate is disabled in production.
 * Called from the server entry point, not from the middleware itself, so it
 * doesn't fire once per request.
 */
export const logApiKeyStatus = (): void => {
  if (process.env.NODE_ENV === 'production' && !process.env.API_KEY) {
    console.warn(
      '[security] API_KEY is not set — every mutating endpoint on this deployment ' +
        'is reachable without credentials, including POST /api/backup/import ' +
        '(mode: "replace"), which deletes data. See docs/SECURITY.md.'
    );
  }
};

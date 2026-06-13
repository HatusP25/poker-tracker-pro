import { execFileSync } from 'node:child_process';

// Reset the disposable E2E database once before the suite runs so tests start
// from a known-empty state. Refuses to touch anything that isn't an e2e DB.
export default async function globalSetup() {
  const url =
    process.env.E2E_DATABASE_URL ||
    'postgresql://hatuspellegrini@localhost:5432/poker_tracker_e2e';

  if (!/e2e/i.test(url)) {
    throw new Error(`Refusing to reset a non-e2e database: ${url}`);
  }

  // TRUNCATE ... CASCADE clears all rows regardless of FK order.
  const sql =
    'TRUNCATE TABLE rebuy_events, session_entries, player_notes, ' +
    'session_templates, sessions, players, groups RESTART IDENTITY CASCADE;';

  execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    stdio: 'inherit',
  });
}

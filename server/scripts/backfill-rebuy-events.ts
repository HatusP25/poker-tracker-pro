/**
 * Backfill derived RebuyEvent rows for sessions that never had any.
 *
 * WHY. `RebuyEvent` rows were only ever written by the live-session path, so a
 * night typed in by hand has none — and the entire Banter Pack counts rebuys by
 * counting those rows. ATM, Houdini, Phoenix, Rebuy Royalty, "most rebuys" and
 * "biggest comeback" have therefore been silently biased toward live-tracked
 * nights. This reconstructs the missing rows from each entry's recorded total.
 *
 * WHAT IT TOUCHES. It only ever INSERTS `rebuy_events` rows with `derived = true`.
 * It never reads, modifies or deletes a `SessionEntry`, a `Session`, or any money
 * field. Buy-ins, cash-outs and settlements are untouched, so every existing
 * profit, balance and settlement figure is bit-for-bit unchanged.
 *
 * SAFETY.
 *   - dry run by default; nothing is written without --apply
 *   - idempotent: an entry that already has ANY rebuy event is skipped, so a
 *     second run is a no-op and recorded live rebuys are never double-counted
 *   - reversible: --undo deletes only derived rows
 *   - refuses to run unless --expect <substring> matches the DATABASE_URL, so it
 *     cannot be pointed at the wrong database by accident
 *
 * USAGE
 *   # see what would happen (writes nothing)
 *   DATABASE_URL=... npx tsx scripts/backfill-rebuy-events.ts --expect poker_tracker_test
 *
 *   # actually write
 *   DATABASE_URL=... npx tsx scripts/backfill-rebuy-events.ts --expect <db> --apply
 *
 *   # undo — removes every derived row, leaving recorded ones alone
 *   DATABASE_URL=... npx tsx scripts/backfill-rebuy-events.ts --expect <db> --undo --apply
 *
 * Take a verified backup first. See docs/SECURITY.md.
 */

import { PrismaClient } from '@prisma/client';
import { deriveRebuyAmounts } from '../src/utils/rebuys';

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const valueOf = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const APPLY = has('--apply');
const UNDO = has('--undo');
const EXPECT = valueOf('--expect');

const prisma = new PrismaClient();

function assertTargetDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }
  if (!EXPECT) {
    throw new Error(
      'Refusing to run without --expect <substring>. Pass the database name you ' +
        'intend to modify, e.g. --expect poker_tracker_test, so this cannot be ' +
        'pointed at the wrong database by accident.'
    );
  }
  if (!url.includes(EXPECT)) {
    throw new Error(
      `Refusing to run: DATABASE_URL does not contain "${EXPECT}". ` +
        'Check which database you are pointed at.'
    );
  }
}

async function undo() {
  const doomed = await prisma.rebuyEvent.count({ where: { derived: true } });
  console.log(`\nDerived rebuy events to remove: ${doomed}`);
  console.log('(Recorded live rebuys are not touched.)');

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to remove them.');
    return;
  }

  const { count } = await prisma.rebuyEvent.deleteMany({ where: { derived: true } });
  console.log(`\n✅ Removed ${count} derived rebuy events.`);
}

async function backfill() {
  const sessions = await prisma.session.findMany({
    where: { deletedAt: null },
    include: {
      group: { select: { name: true, defaultBuyIn: true } },
      entries: { include: { player: { select: { name: true } } } },
      rebuyEvents: { select: { playerId: true } },
    },
    orderBy: { date: 'asc' },
  });

  interface Planned {
    sessionId: string;
    playerId: string;
    amounts: number[];
  }

  const planned: Planned[] = [];
  let skippedExisting = 0;
  let skippedNoExcess = 0;

  console.log('\nPlan');
  console.log('────');

  for (const session of sessions) {
    const withEvents = new Set(session.rebuyEvents.map((r) => r.playerId));
    const lines: string[] = [];

    for (const entry of session.entries) {
      // Idempotency + safety: an entry that already carries rebuy events is left
      // completely alone, whether those events are recorded or previously derived.
      if (withEvents.has(entry.playerId)) {
        skippedExisting++;
        continue;
      }

      const amounts = deriveRebuyAmounts(entry.buyIn, session.group.defaultBuyIn);
      if (amounts.length === 0) {
        skippedNoExcess++;
        continue;
      }

      planned.push({ sessionId: session.id, playerId: entry.playerId, amounts });
      lines.push(
        `    ${entry.player.name.padEnd(16)} $${entry.buyIn.toFixed(2).padStart(9)} ` +
          `-> ${amounts.length} rebuy(s) [${amounts.map((a) => a.toFixed(2)).join(', ')}]`
      );
    }

    if (lines.length > 0) {
      console.log(
        `\n  ${session.date.toISOString().slice(0, 10)}  ${session.group.name} ` +
          `(default $${session.group.defaultBuyIn.toFixed(2)})`
      );
      lines.forEach((l) => console.log(l));
    }
  }

  const rowsToInsert = planned.reduce((sum, p) => sum + p.amounts.length, 0);

  console.log('\nSummary');
  console.log('───────');
  console.log(`  Sessions scanned:              ${sessions.length}`);
  console.log(`  Entries already having events: ${skippedExisting} (skipped)`);
  console.log(`  Entries with no excess buy-in: ${skippedNoExcess} (skipped)`);
  console.log(`  Entries to backfill:           ${planned.length}`);
  console.log(`  RebuyEvent rows to insert:     ${rowsToInsert}`);
  console.log('\n  Nothing else is modified: no SessionEntry, Session, or money field.');

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to write these rows.');
    return;
  }

  if (rowsToInsert === 0) {
    console.log('\n✅ Nothing to do.');
    return;
  }

  await prisma.rebuyEvent.createMany({
    data: planned.flatMap((p) =>
      p.amounts.map((amount) => ({
        sessionId: p.sessionId,
        playerId: p.playerId,
        amount,
        derived: true,
      }))
    ),
  });

  const total = await prisma.rebuyEvent.count();
  const derivedCount = await prisma.rebuyEvent.count({ where: { derived: true } });
  console.log(`\n✅ Inserted ${rowsToInsert} derived rebuy events.`);
  console.log(`   Rebuy events now: ${total} total, ${derivedCount} derived.`);
  console.log('   To reverse: re-run with --undo --apply.');
}

async function main() {
  assertTargetDatabase();

  console.log(`Database : ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@')}`);
  console.log(`Mode     : ${UNDO ? 'UNDO' : 'BACKFILL'} ${APPLY ? '(APPLY)' : '(dry run)'}`);

  if (UNDO) await undo();
  else await backfill();
}

main()
  .catch((error) => {
    console.error('\n❌', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

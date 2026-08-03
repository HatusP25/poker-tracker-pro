import { Prisma } from '@prisma/client';

/**
 * Schema-driven row mapping for backup import.
 *
 * `backupService` used to hand-list the columns for each model in its create and
 * update calls. Every new column was therefore a silent data-loss bug: the export
 * carried it (it comes from `findMany`), the import quietly dropped it, and the
 * loss only surfaced when someone restored. That happened three times running —
 * `status`/`settlements`/`completedAt`/`deletedAt` (F-01), `cashedOutAt` (F-04),
 * and `derived` (F-07), each caught by luck rather than design.
 *
 * Driving the mapping off Prisma's DMMF removes the list entirely: a new column is
 * carried automatically, and `backupRows.test.ts` fails loudly if anyone reverts to
 * maintaining one by hand.
 */

/**
 * Models a backup covers. Asserted against the schema by test, so adding a model
 * without deciding whether it belongs in a backup breaks the build rather than
 * silently shipping an incomplete backup.
 */
export const BACKED_UP_MODELS = [
  'Group',
  'Player',
  'Session',
  'SessionEntry',
  'RebuyEvent',
  'PlayerNote',
  'SessionTemplate',
  'Season',
] as const;

export type BackedUpModel = (typeof BACKED_UP_MODELS)[number];

interface CoerceOptions {
  /** Omit the primary key — update payloads must not try to rewrite it. */
  omitId?: boolean;
}

/**
 * Project a backup row onto exactly the scalar columns its model declares,
 * converting date strings to `Date`.
 *
 * - Fields absent from the row are omitted, so schema defaults apply. This is how
 *   a version 1 file (no `derived`, no `cashedOutAt`) imports cleanly.
 * - Unknown fields are dropped, so a hand-edited file or an export from a newer
 *   schema can't hand Prisma something it will reject.
 * - Relation fields and Prisma's `_count` never survive.
 */
export function coerceBackupRow(
  modelName: BackedUpModel,
  row: Record<string, unknown>,
  options: CoerceOptions = {}
): Record<string, unknown> {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
  if (!model) {
    throw new Error(`Unknown model in backup mapping: ${modelName}`);
  }

  const out: Record<string, unknown> = {};

  for (const field of model.fields) {
    if (field.kind !== 'scalar') continue;
    if (options.omitId && field.name === 'id') continue;
    if (!(field.name in row)) continue;

    const value = row[field.name];
    out[field.name] =
      field.type === 'DateTime' && value !== null && value !== undefined
        ? new Date(value as string)
        : value;
  }

  return out;
}

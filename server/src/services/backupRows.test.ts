import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { coerceBackupRow, BACKED_UP_MODELS } from './backupRows';

/** Build a row carrying every scalar field the schema declares for a model. */
function completeRow(modelName: string): Record<string, unknown> {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName)!;
  const row: Record<string, unknown> = {};
  for (const f of model.fields) {
    if (f.kind !== 'scalar') continue;
    row[f.name] =
      f.type === 'DateTime'
        ? '2026-05-01T00:00:00.000Z'
        : f.type === 'Boolean'
          ? true
          : f.type === 'Float' || f.type === 'Int'
            ? 1
            : `${f.name}-value`;
  }
  return row;
}

describe('coerceBackupRow', () => {
  /**
   * The regression this exists to prevent: backupService used to hand-list the
   * columns for each model, so every new column was a silent data-loss bug on
   * restore. It happened three times running — `deletedAt`/`settlements`/`status`
   * (F-01), `cashedOutAt` (F-04), `derived` (F-07). Driving the mapping off the
   * schema means a new column is carried automatically, and this test fails loudly
   * if anyone reverts to a hand-maintained list.
   */
  describe.each(BACKED_UP_MODELS)('%s', (modelName) => {
    it('carries every scalar field the schema declares', () => {
      const row = completeRow(modelName);
      const coerced = coerceBackupRow(modelName, row);

      expect(Object.keys(coerced).sort()).toEqual(Object.keys(row).sort());
    });

    it('converts every DateTime to a Date', () => {
      const coerced = coerceBackupRow(modelName, completeRow(modelName));
      const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName)!;

      for (const f of model.fields) {
        if (f.kind === 'scalar' && f.type === 'DateTime') {
          expect(coerced[f.name]).toBeInstanceOf(Date);
        }
      }
    });
  });

  it('omits fields the row does not carry, so schema defaults apply', () => {
    // A version 1 backup has no `derived` on its rebuy events.
    const coerced = coerceBackupRow('RebuyEvent', {
      id: 'r1',
      sessionId: 's1',
      playerId: 'p1',
      amount: 5,
      createdAt: '2026-05-01T00:00:00.000Z',
    });

    expect('derived' in coerced).toBe(false);
    expect(coerced.amount).toBe(5);
  });

  it('drops unknown fields rather than passing them to Prisma', () => {
    const coerced = coerceBackupRow('Player', {
      id: 'p1',
      groupId: 'g1',
      name: 'Ana',
      isActive: true,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      // A hand-edited file, or an export from a newer schema.
      somethingElse: 'nope',
      _count: { sessions: 3 },
    });

    expect('somethingElse' in coerced).toBe(false);
    expect('_count' in coerced).toBe(false);
    expect(coerced.name).toBe('Ana');
  });

  it('never includes relation fields', () => {
    const coerced = coerceBackupRow('Session', {
      id: 's1',
      groupId: 'g1',
      date: '2026-05-01T00:00:00.000Z',
      entries: [{ id: 'e1' }],
      group: { id: 'g1' },
    });

    expect('entries' in coerced).toBe(false);
    expect('group' in coerced).toBe(false);
  });

  it('preserves an explicit null on a nullable date', () => {
    const coerced = coerceBackupRow('Session', {
      id: 's1',
      groupId: 'g1',
      date: '2026-05-01T00:00:00.000Z',
      deletedAt: null,
    });

    expect(coerced.deletedAt).toBeNull();
  });

  it('preserves a real deletion timestamp — soft deletes must survive a restore', () => {
    const coerced = coerceBackupRow('Session', {
      id: 's1',
      deletedAt: '2026-04-02T00:00:00.000Z',
    });

    expect(coerced.deletedAt).toBeInstanceOf(Date);
    expect((coerced.deletedAt as Date).toISOString()).toBe('2026-04-02T00:00:00.000Z');
  });

  it('omits the primary key when asked, for update payloads', () => {
    const coerced = coerceBackupRow('Player', completeRow('Player'), { omitId: true });

    expect('id' in coerced).toBe(false);
    expect(coerced.name).toBeDefined();
  });

  it('throws for a model that is not part of the backup', () => {
    expect(() => coerceBackupRow('NotAModel' as never, {})).toThrow(/unknown model/i);
  });
});

describe('BACKED_UP_MODELS', () => {
  it('covers every model in the schema — a new model must be an explicit decision', () => {
    const all = Prisma.dmmf.datamodel.models.map((m) => m.name).sort();
    expect([...BACKED_UP_MODELS].sort()).toEqual(all);
  });
});

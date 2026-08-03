import { describe, it, expect } from 'vitest';
import {
  validateBackup,
  collectBackupGroupIds,
  isLegacyBackup,
  BACKUP_VERSION,
} from './backupService';

/** A complete v2 backup with no rows — the minimal valid shape. */
const emptyV2 = () => ({
  version: BACKUP_VERSION,
  exportDate: '2026-07-30T00:00:00.000Z',
  scope: { groupIds: [] },
  data: {
    groups: [],
    players: [],
    sessions: [],
    entries: [],
    rebuyEvents: [],
    playerNotes: [],
    templates: [],
    seasons: [],
  },
});

/** A v1 backup as written by the pre-2026-07-30 exporter. */
const emptyV1 = () => ({
  version: '1.0.0',
  exportDate: '2026-06-01T00:00:00.000Z',
  data: { groups: [], players: [], sessions: [], entries: [] },
});

describe('isLegacyBackup', () => {
  it('recognises a 1.x backup', () => {
    expect(isLegacyBackup('1.0.0')).toBe(true);
    expect(isLegacyBackup('1.4.2')).toBe(true);
  });

  it('does not treat the current version as legacy', () => {
    expect(isLegacyBackup(BACKUP_VERSION)).toBe(false);
  });

  it('treats a missing version as not-legacy (validateBackup rejects it separately)', () => {
    expect(isLegacyBackup(undefined)).toBe(false);
  });
});

describe('validateBackup', () => {
  it('accepts a well-formed v2 backup', () => {
    const result = validateBackup(emptyV2());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a backup with no version', () => {
    const backup = emptyV2();
    delete (backup as any).version;

    const result = validateBackup(backup);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/version/i);
  });

  it('rejects a backup with no data object', () => {
    const result = validateBackup({ version: BACKUP_VERSION });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/data/i);
  });

  it.each(['groups', 'players', 'sessions', 'entries'])(
    'rejects a v2 backup missing the %s array',
    (key) => {
      const backup = emptyV2();
      delete (backup.data as any)[key];

      const result = validateBackup(backup);
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain(key);
    }
  );

  it.each(['rebuyEvents', 'playerNotes', 'templates'])(
    'rejects a v2 backup missing the %s array — these are what v1 silently dropped',
    (key) => {
      const backup = emptyV2();
      delete (backup.data as any)[key];

      const result = validateBackup(backup);
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain(key);
    }
  );

  describe('legacy v1 files', () => {
    it('accepts them — a v1 backup is still restorable, just not complete', () => {
      const result = validateBackup(emptyV1());
      expect(result.valid).toBe(true);
    });

    it('warns about every category of data a v1 file cannot restore', () => {
      const warnings = validateBackup(emptyV1()).warnings.join(' ').toLowerCase();

      expect(warnings).toContain('rebuy');
      expect(warnings).toContain('note');
      expect(warnings).toContain('template');
      expect(warnings).toContain('settlement');
      expect(warnings).toContain('deleted');
    });

    it('does not require the v2-only arrays', () => {
      const result = validateBackup(emptyV1());
      expect(result.errors).toEqual([]);
    });
  });

  describe('pre-existing data-quality warnings still fire', () => {
    it('warns when a backup contains no groups', () => {
      const warnings = validateBackup(emptyV2()).warnings.join(' ');
      expect(warnings).toMatch(/no groups/i);
    });

    it('warns about players referencing a group that is not in the file', () => {
      const backup = emptyV2();
      backup.data.groups = [{ id: 'g1', name: 'Real' }] as any;
      backup.data.players = [{ id: 'p1', groupId: 'ghost', name: 'Orphan' }] as any;

      const warnings = validateBackup(backup).warnings.join(' ');
      expect(warnings).toMatch(/missing group references/i);
    });
  });
});

describe('collectBackupGroupIds', () => {
  it('returns the ids of the groups in the file', () => {
    const backup = emptyV2();
    backup.data.groups = [{ id: 'g1' }, { id: 'g2' }] as any;

    expect(collectBackupGroupIds(backup).sort()).toEqual(['g1', 'g2']);
  });

  it('returns an empty list for a file with no groups', () => {
    expect(collectBackupGroupIds(emptyV2())).toEqual([]);
  });

  it('folds in scope.groupIds so an empty-but-scoped backup still deletes its scope', () => {
    const backup = emptyV2();
    backup.scope = { groupIds: ['g-scoped'] };

    expect(collectBackupGroupIds(backup)).toEqual(['g-scoped']);
  });

  it('dedupes ids present in both groups and scope', () => {
    const backup = emptyV2();
    backup.data.groups = [{ id: 'g1' }] as any;
    backup.scope = { groupIds: ['g1'] };

    expect(collectBackupGroupIds(backup)).toEqual(['g1']);
  });

  it('ignores rows with no id rather than emitting undefined', () => {
    const backup = emptyV2();
    backup.data.groups = [{ id: 'g1' }, { name: 'no id' }] as any;

    expect(collectBackupGroupIds(backup)).toEqual(['g1']);
  });

  it('tolerates a malformed backup without throwing', () => {
    expect(collectBackupGroupIds({} as any)).toEqual([]);
    expect(collectBackupGroupIds({ data: {} } as any)).toEqual([]);
  });
});

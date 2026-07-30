import { describe, it, expect } from 'vitest';
import { describeReplaceScope, isReplaceConfirmed } from './backupScope';

const v2 = (groups: { id: string; name: string }[]) => ({
  version: '2.0.0',
  exportDate: '2026-07-30T00:00:00.000Z',
  scope: { groupIds: groups.map((g) => g.id) },
  data: {
    groups,
    players: [],
    sessions: [],
    entries: [],
    rebuyEvents: [],
    playerNotes: [],
    templates: [],
  },
});

describe('describeReplaceScope', () => {
  it('names the single group a scoped backup will replace', () => {
    const scope = describeReplaceScope(v2([{ id: 'g1', name: 'Thursday Night' }]));

    expect(scope.groupNames).toEqual(['Thursday Night']);
    expect(scope.confirmPhrase).toBe('Thursday Night');
    expect(scope.isLegacy).toBe(false);
  });

  it('requires an unambiguous phrase when several groups are affected', () => {
    const scope = describeReplaceScope(
      v2([
        { id: 'g1', name: 'Thursday Night' },
        { id: 'g2', name: 'Sunday Game' },
      ])
    );

    expect(scope.groupNames).toEqual(['Thursday Night', 'Sunday Game']);
    expect(scope.confirmPhrase).toBe('REPLACE ALL');
  });

  it('flags a v1 file so the UI can explain why replace is unavailable', () => {
    const legacy = {
      version: '1.0.0',
      exportDate: '2026-06-01T00:00:00.000Z',
      data: { groups: [{ id: 'g1', name: 'Old' }], players: [], sessions: [], entries: [] },
    };

    expect(describeReplaceScope(legacy).isLegacy).toBe(true);
  });

  it('reports an empty scope for a backup naming no groups', () => {
    const scope = describeReplaceScope(v2([]));

    expect(scope.groupNames).toEqual([]);
    expect(scope.confirmPhrase).toBe('REPLACE ALL');
  });

  it('tolerates a malformed file without throwing', () => {
    expect(describeReplaceScope({} as any).groupNames).toEqual([]);
    expect(describeReplaceScope({ data: {} } as any).groupNames).toEqual([]);
  });

  it('falls back to the id when a group row has no name', () => {
    const scope = describeReplaceScope(v2([{ id: 'g1' } as any]));
    expect(scope.groupNames).toEqual(['g1']);
  });
});

describe('isReplaceConfirmed', () => {
  it('accepts the exact phrase', () => {
    expect(isReplaceConfirmed('Thursday Night', 'Thursday Night')).toBe(true);
  });

  it('ignores surrounding whitespace — a trailing space is not a mistake worth blocking on', () => {
    expect(isReplaceConfirmed('  Thursday Night  ', 'Thursday Night')).toBe(true);
  });

  it('rejects a near miss', () => {
    expect(isReplaceConfirmed('Thursday', 'Thursday Night')).toBe(false);
    expect(isReplaceConfirmed('Thursday Nights', 'Thursday Night')).toBe(false);
  });

  it('rejects empty input even against an empty phrase — confirmation must be deliberate', () => {
    expect(isReplaceConfirmed('', '')).toBe(false);
    expect(isReplaceConfirmed('   ', 'REPLACE ALL')).toBe(false);
  });

  it('is case-sensitive, so REPLACE ALL cannot be typed absent-mindedly', () => {
    expect(isReplaceConfirmed('replace all', 'REPLACE ALL')).toBe(false);
    expect(isReplaceConfirmed('REPLACE ALL', 'REPLACE ALL')).toBe(true);
  });
});

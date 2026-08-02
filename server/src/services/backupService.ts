import { prisma } from '../lib/prisma';

/**
 * Backup / restore.
 *
 * Format v2 (2026-07-30) exists because v1 was lossy in a way that destroyed data:
 * it exported only groups/players/sessions/entries, so an export -> replace-restore
 * round trip permanently dropped every rebuy event, player note and template, threw
 * away each session's status/settlements/completedAt, and — worst — dropped
 * `deletedAt`, resurrecting soft-deleted sessions into the live statistics.
 *
 * v2 covers all seven models and every field needed to reconstruct a group exactly.
 * v1 files are still readable, but are refused in `replace` mode: a replace deletes
 * rows that a v1 file provably cannot restore.
 */

export const BACKUP_VERSION = '2.0.0';

export interface BackupData {
  version: string;
  exportDate: string;
  /** Groups this backup covers. Absent on v1 files. */
  scope?: { groupIds: string[] };
  data: {
    groups: any[];
    players: any[];
    sessions: any[];
    entries: any[];
    // v2 only — absent on legacy files.
    rebuyEvents?: any[];
    playerNotes?: any[];
    templates?: any[];
  };
}

export interface ImportOptions {
  mode: 'merge' | 'replace';
  skipDuplicates: boolean;
}

export interface ImportReport {
  success: boolean;
  imported: {
    groups: number;
    players: number;
    sessions: number;
    entries: number;
    rebuyEvents: number;
    playerNotes: number;
    templates: number;
  };
  skipped: {
    groups: number;
    players: number;
    sessions: number;
    entries: number;
    rebuyEvents: number;
    playerNotes: number;
    templates: number;
  };
  errors: string[];
}

const emptyTally = (): ImportReport['imported'] => ({
  groups: 0,
  players: 0,
  sessions: 0,
  entries: 0,
  rebuyEvents: 0,
  playerNotes: 0,
  templates: 0,
});

/** Arrays every backup must carry, in every version. */
const CORE_ARRAYS = ['groups', 'players', 'sessions', 'entries'] as const;
/** Arrays added in v2. Their absence is exactly what made v1 lossy. */
const V2_ARRAYS = ['rebuyEvents', 'playerNotes', 'templates'] as const;

/**
 * True for backups written by the pre-2026-07-30 exporter (version 1.x).
 * A missing version is not "legacy" — it's invalid, and validateBackup says so.
 */
export function isLegacyBackup(version: string | undefined): boolean {
  return typeof version === 'string' && version.startsWith('1.');
}

/** Everything a v1 file cannot bring back, spelled out for the operator. */
export const LEGACY_LOSS_WARNING =
  'This is a version 1 backup. It does not contain rebuy events, player notes, ' +
  'session templates, settlement records, session status, or which sessions were ' +
  'deleted. Restoring it will not recreate any of those, and any session it ' +
  'restores will come back as a completed, non-deleted session.';

/**
 * Group ids a backup covers — the blast radius of a `replace` restore.
 *
 * Folds in `scope.groupIds` as well as the ids of the groups actually present, so
 * a backup taken of a group that has since been emptied still scopes its own delete
 * rather than silently widening to the whole database.
 */
export function collectBackupGroupIds(backup: BackupData): string[] {
  const ids = new Set<string>();

  for (const g of backup?.data?.groups ?? []) {
    if (g && typeof g.id === 'string') ids.add(g.id);
  }
  for (const id of backup?.scope?.groupIds ?? []) {
    if (typeof id === 'string') ids.add(id);
  }

  return [...ids];
}

export class BackupService {
  /**
   * Export a single group, or the whole database when no groupId is given.
   *
   * Every model is included. Sessions carry status/settlements/completedAt/deletedAt
   * so a restore reproduces the group exactly, including which sessions were deleted.
   */
  async exportDatabase(groupId?: string): Promise<BackupData> {
    const groupScope = groupId ? { id: groupId } : {};
    const byGroup = groupId ? { groupId } : {};
    const viaSession = groupId ? { session: { groupId } } : {};
    const viaPlayer = groupId ? { player: { groupId } } : {};

    const [groups, players, sessions, entries, rebuyEvents, playerNotes, templates] =
      await Promise.all([
        prisma.group.findMany({ where: groupScope }),
        prisma.player.findMany({ where: byGroup }),
        // deletedAt is NOT filtered: a backup must preserve deletion state, not
        // silently drop or resurrect soft-deleted sessions.
        prisma.session.findMany({ where: byGroup }),
        prisma.sessionEntry.findMany({ where: viaSession }),
        prisma.rebuyEvent.findMany({ where: viaSession }),
        prisma.playerNote.findMany({ where: viaPlayer }),
        prisma.sessionTemplate.findMany({ where: byGroup }),
      ]);

    return {
      version: BACKUP_VERSION,
      exportDate: new Date().toISOString(),
      scope: { groupIds: groups.map((g) => g.id) },
      data: { groups, players, sessions, entries, rebuyEvents, playerNotes, templates },
    };
  }

  /**
   * Validate backup structure. Pure — no DB access.
   */
  validateBackup(backup: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!backup?.version) {
      errors.push('Missing backup version');
    }

    if (!backup?.exportDate) {
      warnings.push('Missing export date');
    }

    if (!backup?.data) {
      errors.push('Missing data object');
      return { valid: false, errors, warnings };
    }

    const legacy = isLegacyBackup(backup.version);

    for (const key of CORE_ARRAYS) {
      if (!Array.isArray(backup.data[key])) {
        errors.push(`Missing or invalid ${key} array`);
      }
    }

    if (legacy) {
      warnings.push(LEGACY_LOSS_WARNING);
    } else {
      // A current-version file must be complete; a missing array here means the
      // file is truncated or hand-edited, not merely old.
      for (const key of V2_ARRAYS) {
        if (!Array.isArray(backup.data[key])) {
          errors.push(`Missing or invalid ${key} array`);
        }
      }
    }

    if (Array.isArray(backup.data.groups) && backup.data.groups.length === 0) {
      warnings.push('No groups found in backup');
    }
    if (Array.isArray(backup.data.players) && backup.data.players.length === 0) {
      warnings.push('No players found in backup');
    }
    if (Array.isArray(backup.data.sessions) && backup.data.sessions.length === 0) {
      warnings.push('No sessions found in backup');
    }

    if (Array.isArray(backup.data.players) && Array.isArray(backup.data.groups)) {
      const groupIds = new Set(backup.data.groups.map((g: any) => g.id));
      const orphaned = backup.data.players.filter((p: any) => !groupIds.has(p.groupId));
      if (orphaned.length > 0) {
        warnings.push(`Found ${orphaned.length} players with missing group references`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Import backup data.
   *
   * `replace` deletes only within the groups this backup covers — never the whole
   * database — and is refused for v1 files, which cannot restore what the delete
   * would remove.
   */
  async importDatabase(backup: BackupData, options: ImportOptions): Promise<ImportReport> {
    const report: ImportReport = {
      success: false,
      imported: emptyTally(),
      skipped: emptyTally(),
      errors: [],
    };

    const validation = this.validateBackup(backup);
    if (!validation.valid) {
      report.errors = validation.errors;
      return report;
    }

    const legacy = isLegacyBackup(backup.version);

    if (options.mode === 'replace' && legacy) {
      report.errors.push(
        'Refusing to run a "replace" restore from a version 1 backup: it would ' +
          'delete rebuy events, player notes, templates and settlements that this ' +
          'file cannot restore. Use "merge" instead. ' +
          LEGACY_LOSS_WARNING
      );
      return report;
    }

    const groupIds = collectBackupGroupIds(backup);

    if (options.mode === 'replace' && groupIds.length === 0) {
      report.errors.push(
        'Refusing to run a "replace" restore from a backup that names no groups — ' +
          'there is nothing to scope the deletion to.'
      );
      return report;
    }

    const { skipDuplicates } = options;

    /**
     * Upsert one row. Returns 'imported' | 'skipped', and records errors per row so
     * one bad row doesn't abort a whole restore.
     */
    const upsert = async (
      kind: keyof ImportReport['imported'],
      label: string,
      find: () => Promise<unknown>,
      update: () => Promise<unknown>,
      create: () => Promise<unknown>
    ) => {
      try {
        const existing = await find();
        if (existing && skipDuplicates) {
          report.skipped[kind]++;
          return;
        }
        if (existing) await update();
        else await create();
        report.imported[kind]++;
      } catch (error: any) {
        report.errors.push(`${label}: ${error.message}`);
      }
    };

    try {
      await prisma.$transaction(
        async (tx) => {
          if (options.mode === 'replace') {
            // Scoped to this backup's groups only. Children first for FK order.
            // Any group NOT in this backup is left completely untouched.
            const inScope = { in: groupIds };
            await tx.rebuyEvent.deleteMany({ where: { session: { groupId: inScope } } });
            await tx.sessionEntry.deleteMany({ where: { session: { groupId: inScope } } });
            await tx.playerNote.deleteMany({ where: { player: { groupId: inScope } } });
            await tx.sessionTemplate.deleteMany({ where: { groupId: inScope } });
            await tx.session.deleteMany({ where: { groupId: inScope } });
            await tx.player.deleteMany({ where: { groupId: inScope } });
            await tx.group.deleteMany({ where: { id: inScope } });
          }

          for (const group of backup.data.groups) {
            await upsert(
              'groups',
              `Group ${group.name}`,
              () => tx.group.findUnique({ where: { id: group.id } }),
              () =>
                tx.group.update({
                  where: { id: group.id },
                  data: {
                    name: group.name,
                    defaultBuyIn: group.defaultBuyIn,
                    currency: group.currency,
                    ...(group.userRole !== undefined && { userRole: group.userRole }),
                  },
                }),
              () =>
                tx.group.create({
                  data: {
                    id: group.id,
                    name: group.name,
                    defaultBuyIn: group.defaultBuyIn,
                    currency: group.currency,
                    ...(group.userRole !== undefined && { userRole: group.userRole }),
                    createdAt: new Date(group.createdAt),
                    updatedAt: new Date(group.updatedAt),
                  },
                })
            );
          }

          for (const player of backup.data.players) {
            await upsert(
              'players',
              `Player ${player.name}`,
              () => tx.player.findUnique({ where: { id: player.id } }),
              () =>
                tx.player.update({
                  where: { id: player.id },
                  data: {
                    name: player.name,
                    avatarUrl: player.avatarUrl,
                    isActive: player.isActive,
                  },
                }),
              () =>
                tx.player.create({
                  data: {
                    id: player.id,
                    groupId: player.groupId,
                    name: player.name,
                    avatarUrl: player.avatarUrl,
                    isActive: player.isActive,
                    createdAt: new Date(player.createdAt),
                    updatedAt: new Date(player.updatedAt),
                  },
                })
            );
          }

          for (const session of backup.data.sessions) {
            // v1 files carry none of these; default to the shape v1 implicitly
            // assumed (a completed, non-deleted session) rather than writing null
            // status, which nothing downstream expects.
            const lifecycle = {
              status: session.status ?? 'COMPLETED',
              settlements: session.settlements ?? null,
              completedAt: session.completedAt ? new Date(session.completedAt) : null,
              deletedAt: session.deletedAt ? new Date(session.deletedAt) : null,
            };

            await upsert(
              'sessions',
              `Session ${session.id}`,
              () => tx.session.findUnique({ where: { id: session.id } }),
              () =>
                tx.session.update({
                  where: { id: session.id },
                  data: {
                    date: new Date(session.date),
                    startTime: session.startTime,
                    endTime: session.endTime,
                    location: session.location,
                    notes: session.notes,
                    photoUrls: session.photoUrls,
                    ...lifecycle,
                  },
                }),
              () =>
                tx.session.create({
                  data: {
                    id: session.id,
                    groupId: session.groupId,
                    date: new Date(session.date),
                    startTime: session.startTime,
                    endTime: session.endTime,
                    location: session.location,
                    notes: session.notes,
                    photoUrls: session.photoUrls,
                    ...lifecycle,
                    createdAt: new Date(session.createdAt),
                    updatedAt: new Date(session.updatedAt),
                  },
                })
            );
          }

          for (const entry of backup.data.entries) {
            // Absent on v1 files and on rows written before early cash-out existed;
            // null is exactly what those rows mean ("still at the table").
            const cashedOutAt = entry.cashedOutAt ? new Date(entry.cashedOutAt) : null;

            await upsert(
              'entries',
              `Entry ${entry.id}`,
              () => tx.sessionEntry.findUnique({ where: { id: entry.id } }),
              () =>
                tx.sessionEntry.update({
                  where: { id: entry.id },
                  data: { buyIn: entry.buyIn, cashOut: entry.cashOut, cashedOutAt },
                }),
              () =>
                tx.sessionEntry.create({
                  data: {
                    id: entry.id,
                    sessionId: entry.sessionId,
                    playerId: entry.playerId,
                    buyIn: entry.buyIn,
                    cashOut: entry.cashOut,
                    cashedOutAt,
                    createdAt: new Date(entry.createdAt),
                    updatedAt: new Date(entry.updatedAt),
                  },
                })
            );
          }

          for (const rebuy of backup.data.rebuyEvents ?? []) {
            // Absent on rows written before the derived flag existed; false is what
            // those rows mean (recorded live), which is also the safe default —
            // a restore must never silently reclassify real history as derived.
            const derived = rebuy.derived === true;

            await upsert(
              'rebuyEvents',
              `Rebuy ${rebuy.id}`,
              () => tx.rebuyEvent.findUnique({ where: { id: rebuy.id } }),
              () =>
                tx.rebuyEvent.update({
                  where: { id: rebuy.id },
                  data: { amount: rebuy.amount, derived },
                }),
              () =>
                tx.rebuyEvent.create({
                  data: {
                    id: rebuy.id,
                    sessionId: rebuy.sessionId,
                    playerId: rebuy.playerId,
                    amount: rebuy.amount,
                    derived,
                    createdAt: new Date(rebuy.createdAt),
                  },
                })
            );
          }

          for (const note of backup.data.playerNotes ?? []) {
            await upsert(
              'playerNotes',
              `Note ${note.id}`,
              () => tx.playerNote.findUnique({ where: { id: note.id } }),
              () =>
                tx.playerNote.update({
                  where: { id: note.id },
                  data: { note: note.note, tags: note.tags },
                }),
              () =>
                tx.playerNote.create({
                  data: {
                    id: note.id,
                    playerId: note.playerId,
                    note: note.note,
                    tags: note.tags,
                    createdAt: new Date(note.createdAt),
                    updatedAt: new Date(note.updatedAt),
                  },
                })
            );
          }

          for (const template of backup.data.templates ?? []) {
            await upsert(
              'templates',
              `Template ${template.name}`,
              () => tx.sessionTemplate.findUnique({ where: { id: template.id } }),
              () =>
                tx.sessionTemplate.update({
                  where: { id: template.id },
                  data: {
                    name: template.name,
                    location: template.location,
                    defaultTime: template.defaultTime,
                    playerIds: template.playerIds,
                  },
                }),
              () =>
                tx.sessionTemplate.create({
                  data: {
                    id: template.id,
                    groupId: template.groupId,
                    name: template.name,
                    location: template.location,
                    defaultTime: template.defaultTime,
                    playerIds: template.playerIds,
                    createdAt: new Date(template.createdAt),
                    updatedAt: new Date(template.updatedAt),
                  },
                })
            );
          }
        },
        // A full-group restore does far more work than the default 5s interactive
        // transaction budget allows once a group has real history.
        { timeout: 120_000, maxWait: 10_000 }
      );

      report.success = report.errors.length === 0;
    } catch (error: any) {
      report.errors.push(`Transaction failed: ${error.message}`);
      report.success = false;
    }

    return report;
  }
}

export const backupService = new BackupService();

// Bound method exports so the pure helpers can be imported directly by tests and
// callers without instantiating the service.
export const validateBackup = (backup: any) => backupService.validateBackup(backup);

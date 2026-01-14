import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BackupData {
  version: string;
  exportDate: string;
  data: {
    groups: any[];
    players: any[];
    sessions: any[];
    entries: any[];
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
  };
  skipped: {
    groups: number;
    players: number;
    sessions: number;
    entries: number;
  };
  errors: string[];
}

export class BackupService {
  /**
   * Export entire database to JSON format
   */
  async exportDatabase(): Promise<BackupData> {
    const [groups, players, sessions, entries] = await Promise.all([
      prisma.group.findMany({
        include: {
          _count: {
            select: {
              players: true,
              sessions: true,
            },
          },
        },
      }),
      prisma.player.findMany(),
      prisma.session.findMany(),
      prisma.sessionEntry.findMany(),
    ]);

    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: {
        groups,
        players,
        sessions,
        entries,
      },
    };
  }

  /**
   * Validate backup data structure
   */
  validateBackup(backup: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check version
    if (!backup.version) {
      errors.push('Missing backup version');
    }

    // Check exportDate
    if (!backup.exportDate) {
      warnings.push('Missing export date');
    }

    // Check data structure
    if (!backup.data) {
      errors.push('Missing data object');
      return { valid: false, errors, warnings };
    }

    // Validate required arrays
    const requiredArrays = ['groups', 'players', 'sessions', 'entries'];
    for (const arr of requiredArrays) {
      if (!Array.isArray(backup.data[arr])) {
        errors.push(`Missing or invalid ${arr} array`);
      }
    }

    // Validate data integrity
    if (Array.isArray(backup.data.groups) && backup.data.groups.length === 0) {
      warnings.push('No groups found in backup');
    }

    if (Array.isArray(backup.data.players) && backup.data.players.length === 0) {
      warnings.push('No players found in backup');
    }

    if (Array.isArray(backup.data.sessions) && backup.data.sessions.length === 0) {
      warnings.push('No sessions found in backup');
    }

    // Check for orphaned data
    if (Array.isArray(backup.data.players) && Array.isArray(backup.data.groups)) {
      const groupIds = new Set(backup.data.groups.map((g: any) => g.id));
      const orphanedPlayers = backup.data.players.filter(
        (p: any) => !groupIds.has(p.groupId)
      );
      if (orphanedPlayers.length > 0) {
        warnings.push(
          `Found ${orphanedPlayers.length} players with missing group references`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Import backup data into database
   */
  async importDatabase(
    backup: BackupData,
    options: ImportOptions
  ): Promise<ImportReport> {
    const report: ImportReport = {
      success: false,
      imported: { groups: 0, players: 0, sessions: 0, entries: 0 },
      skipped: { groups: 0, players: 0, sessions: 0, entries: 0 },
      errors: [],
    };

    // Validate backup first
    const validation = this.validateBackup(backup);
    if (!validation.valid) {
      report.errors = validation.errors;
      return report;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // If replace mode, delete all existing data
        if (options.mode === 'replace') {
          await tx.sessionEntry.deleteMany({});
          await tx.session.deleteMany({});
          await tx.playerNote.deleteMany({});
          await tx.player.deleteMany({});
          await tx.group.deleteMany({});
        }

        // Import groups
        for (const group of backup.data.groups) {
          try {
            const existing = await tx.group.findUnique({
              where: { id: group.id },
            });

            if (existing && options.skipDuplicates) {
              report.skipped.groups++;
              continue;
            }

            if (existing) {
              await tx.group.update({
                where: { id: group.id },
                data: {
                  name: group.name,
                  defaultBuyIn: group.defaultBuyIn,
                  currency: group.currency,
                },
              });
            } else {
              await tx.group.create({
                data: {
                  id: group.id,
                  name: group.name,
                  defaultBuyIn: group.defaultBuyIn,
                  currency: group.currency,
                  createdAt: new Date(group.createdAt),
                  updatedAt: new Date(group.updatedAt),
                },
              });
            }
            report.imported.groups++;
          } catch (error: any) {
            report.errors.push(`Group ${group.name}: ${error.message}`);
          }
        }

        // Import players
        for (const player of backup.data.players) {
          try {
            const existing = await tx.player.findUnique({
              where: { id: player.id },
            });

            if (existing && options.skipDuplicates) {
              report.skipped.players++;
              continue;
            }

            if (existing) {
              await tx.player.update({
                where: { id: player.id },
                data: {
                  name: player.name,
                  avatarUrl: player.avatarUrl,
                  isActive: player.isActive,
                },
              });
            } else {
              await tx.player.create({
                data: {
                  id: player.id,
                  groupId: player.groupId,
                  name: player.name,
                  avatarUrl: player.avatarUrl,
                  isActive: player.isActive,
                  createdAt: new Date(player.createdAt),
                  updatedAt: new Date(player.updatedAt),
                },
              });
            }
            report.imported.players++;
          } catch (error: any) {
            report.errors.push(`Player ${player.name}: ${error.message}`);
          }
        }

        // Import sessions
        for (const session of backup.data.sessions) {
          try {
            const existing = await tx.session.findUnique({
              where: { id: session.id },
            });

            if (existing && options.skipDuplicates) {
              report.skipped.sessions++;
              continue;
            }

            if (existing) {
              await tx.session.update({
                where: { id: session.id },
                data: {
                  date: new Date(session.date),
                  startTime: session.startTime,
                  endTime: session.endTime,
                  location: session.location,
                  notes: session.notes,
                  photoUrls: session.photoUrls,
                },
              });
            } else {
              await tx.session.create({
                data: {
                  id: session.id,
                  groupId: session.groupId,
                  date: new Date(session.date),
                  startTime: session.startTime,
                  endTime: session.endTime,
                  location: session.location,
                  notes: session.notes,
                  photoUrls: session.photoUrls,
                  createdAt: new Date(session.createdAt),
                  updatedAt: new Date(session.updatedAt),
                },
              });
            }
            report.imported.sessions++;
          } catch (error: any) {
            report.errors.push(`Session ${session.id}: ${error.message}`);
          }
        }

        // Import entries
        for (const entry of backup.data.entries) {
          try {
            const existing = await tx.sessionEntry.findUnique({
              where: { id: entry.id },
            });

            if (existing && options.skipDuplicates) {
              report.skipped.entries++;
              continue;
            }

            if (existing) {
              await tx.sessionEntry.update({
                where: { id: entry.id },
                data: {
                  buyIn: entry.buyIn,
                  cashOut: entry.cashOut,
                },
              });
            } else {
              await tx.sessionEntry.create({
                data: {
                  id: entry.id,
                  sessionId: entry.sessionId,
                  playerId: entry.playerId,
                  buyIn: entry.buyIn,
                  cashOut: entry.cashOut,
                  createdAt: new Date(entry.createdAt),
                  updatedAt: new Date(entry.updatedAt),
                },
              });
            }
            report.imported.entries++;
          } catch (error: any) {
            report.errors.push(`Entry ${entry.id}: ${error.message}`);
          }
        }
      });

      report.success = report.errors.length === 0;
    } catch (error: any) {
      report.errors.push(`Transaction failed: ${error.message}`);
      report.success = false;
    }

    return report;
  }
}

export const backupService = new BackupService();

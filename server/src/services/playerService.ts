import { prisma } from '../lib/prisma';
import { isValidPlayerName, isValidNickname, ValidationError } from '../utils/validators';

export class PlayerService {
  /**
   * Get all players for a group
   */
  async getPlayersByGroup(groupId: string, activeOnly = false) {
    return prisma.player.findMany({
      where: {
        groupId,
        ...(activeOnly && { isActive: true }),
      },
      include: {
        _count: {
          select: {
            entries: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get a single player by ID
   */
  async getPlayerById(id: string) {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        group: true,
        _count: {
          select: {
            entries: true,
            notes: true,
          },
        },
      },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    return player;
  }

  /**
   * Create a new player
   */
  async createPlayer(data: {
    groupId: string;
    name: string;
    nickname?: string | null;
    avatarUrl?: string;
    isActive?: boolean;
  }) {
    if (!isValidPlayerName(data.name)) {
      throw new ValidationError('Player name must be between 2 and 50 characters');
    }

    if (!isValidNickname(data.nickname)) {
      throw new ValidationError('Nickname must be 24 characters or fewer');
    }

    // Check for duplicate player name in the same group
    const existing = await prisma.player.findFirst({
      where: {
        groupId: data.groupId,
        name: data.name.trim(),
      },
    });

    if (existing) {
      throw new ValidationError('A player with this name already exists in this group');
    }

    return prisma.player.create({
      data: {
        groupId: data.groupId,
        name: data.name.trim(),
        nickname: data.nickname?.trim() || null,
        avatarUrl: data.avatarUrl,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Update a player
   */
  async updatePlayer(
    id: string,
    data: { name?: string; nickname?: string | null; avatarUrl?: string; isActive?: boolean }
  ) {
    if (data.name !== undefined && !isValidPlayerName(data.name)) {
      throw new ValidationError('Player name must be between 2 and 50 characters');
    }

    if (data.nickname !== undefined && !isValidNickname(data.nickname)) {
      throw new ValidationError('Nickname must be 24 characters or fewer');
    }

    // If updating name, check for duplicates
    if (data.name) {
      const player = await prisma.player.findUnique({ where: { id } });
      if (!player) {
        throw new Error('Player not found');
      }

      const existing = await prisma.player.findFirst({
        where: {
          groupId: player.groupId,
          name: data.name.trim(),
          id: { not: id },
        },
      });

      if (existing) {
        throw new ValidationError('A player with this name already exists in this group');
      }
    }

    return prisma.player.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.nickname !== undefined && { nickname: data.nickname?.trim() || null }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Toggle player active status
   */
  async toggleActive(id: string) {
    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) {
      throw new Error('Player not found');
    }

    return prisma.player.update({
      where: { id },
      data: { isActive: !player.isActive },
    });
  }

  /**
   * Delete a player (only if they have no session entries)
   */
  async deletePlayer(id: string) {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    if (player._count.entries > 0) {
      throw new ValidationError(
        `Cannot delete player with ${player._count.entries} session entries. Consider marking them inactive instead.`
      );
    }

    return prisma.player.delete({ where: { id } });
  }

  /**
   * List notes for a player, newest first
   */
  async getPlayerNotes(playerId: string) {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new Error('Player not found');
    }

    return prisma.playerNote.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a note for a player
   */
  async createPlayerNote(playerId: string, data: { note: string; tags?: string[] }) {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new Error('Player not found');
    }

    if (!data.note || !data.note.trim()) {
      throw new ValidationError('Note content cannot be empty');
    }

    return prisma.playerNote.create({
      data: {
        playerId,
        note: data.note.trim(),
        tags: data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : null,
      },
    });
  }

  /**
   * Update a player note
   */
  async updatePlayerNote(noteId: string, data: { note?: string; tags?: string[] }) {
    const existing = await prisma.playerNote.findUnique({ where: { id: noteId } });
    if (!existing) {
      throw new Error('Player note not found');
    }

    if (data.note !== undefined && !data.note.trim()) {
      throw new ValidationError('Note content cannot be empty');
    }

    return prisma.playerNote.update({
      where: { id: noteId },
      data: {
        ...(data.note !== undefined && { note: data.note.trim() }),
        ...(data.tags !== undefined && {
          tags: data.tags.length > 0 ? JSON.stringify(data.tags) : null,
        }),
      },
    });
  }

  /**
   * Delete a player note
   */
  async deletePlayerNote(noteId: string) {
    const existing = await prisma.playerNote.findUnique({ where: { id: noteId } });
    if (!existing) {
      throw new Error('Player note not found');
    }

    return prisma.playerNote.delete({ where: { id: noteId } });
  }

  /**
   * Search players by name
   */
  async searchPlayers(groupId: string, query: string) {
    // Case-insensitive search - only works with PostgreSQL
    // For PostgreSQL in production, we use mode: 'insensitive'
    // For SQLite in development, contains is case-insensitive by default
    const nameFilter: any = {
      contains: query,
    };

    // Add case-insensitive mode for PostgreSQL
    if (process.env.DATABASE_URL?.includes('postgresql')) {
      nameFilter.mode = 'insensitive';
    }

    return prisma.player.findMany({
      where: {
        groupId,
        name: nameFilter,
      },
      include: {
        _count: {
          select: {
            entries: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}

export const playerService = new PlayerService();

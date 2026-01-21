import { PrismaClient } from '@prisma/client';
import { isValidPlayerName, ValidationError } from '../utils/validators';

const prisma = new PrismaClient();

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
    avatarUrl?: string;
    isActive?: boolean;
  }) {
    if (!isValidPlayerName(data.name)) {
      throw new ValidationError('Player name must be between 2 and 50 characters');
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
    data: { name?: string; avatarUrl?: string; isActive?: boolean }
  ) {
    if (data.name !== undefined && !isValidPlayerName(data.name)) {
      throw new ValidationError('Player name must be between 2 and 50 characters');
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

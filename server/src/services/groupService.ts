import { PrismaClient } from '@prisma/client';
import { isValidGroupName, ValidationError } from '../utils/validators';

const prisma = new PrismaClient();

export class GroupService {
  /**
   * Get all groups
   */
  async getAllGroups() {
    return prisma.group.findMany({
      include: {
        _count: {
          select: {
            players: true,
            sessions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single group by ID
   */
  async getGroupById(id: string) {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            players: true,
            sessions: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    return group;
  }

  /**
   * Create a new group
   */
  async createGroup(data: { name: string; defaultBuyIn?: number; currency?: string }) {
    if (!isValidGroupName(data.name)) {
      throw new ValidationError('Group name must be between 3 and 50 characters');
    }

    if (data.defaultBuyIn !== undefined && data.defaultBuyIn <= 0) {
      throw new ValidationError('Default buy-in must be positive');
    }

    return prisma.group.create({
      data: {
        name: data.name.trim(),
        defaultBuyIn: data.defaultBuyIn || 5.0,
        currency: data.currency || 'USD',
      },
    });
  }

  /**
   * Update a group
   */
  async updateGroup(
    id: string,
    data: { name?: string; defaultBuyIn?: number; currency?: string }
  ) {
    if (data.name !== undefined && !isValidGroupName(data.name)) {
      throw new ValidationError('Group name must be between 3 and 50 characters');
    }

    if (data.defaultBuyIn !== undefined && data.defaultBuyIn <= 0) {
      throw new ValidationError('Default buy-in must be positive');
    }

    return prisma.group.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.defaultBuyIn && { defaultBuyIn: data.defaultBuyIn }),
        ...(data.currency && { currency: data.currency }),
      },
    });
  }

  /**
   * Delete a group (cascade deletes all players, sessions, etc.)
   */
  async deleteGroup(id: string) {
    return prisma.group.delete({
      where: { id },
    });
  }
}

export const groupService = new GroupService();

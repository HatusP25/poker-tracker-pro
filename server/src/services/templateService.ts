import { PrismaClient } from '@prisma/client';
import { ValidationError } from '../utils/validators';

const prisma = new PrismaClient();

export class TemplateService {
  /**
   * Get all templates for a group
   */
  async getTemplatesByGroup(groupId: string) {
    return prisma.sessionTemplate.findMany({
      where: { groupId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single template by ID
   */
  async getTemplateById(id: string) {
    const template = await prisma.sessionTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return template;
  }

  /**
   * Create a new template
   */
  async createTemplate(data: {
    groupId: string;
    name: string;
    location?: string;
    defaultTime?: string;
    playerIds: string[];
  }) {
    if (!data.name || data.name.trim().length < 3) {
      throw new ValidationError('Template name must be at least 3 characters');
    }

    if (!data.playerIds || data.playerIds.length === 0) {
      throw new ValidationError('Template must include at least one player');
    }

    return prisma.sessionTemplate.create({
      data: {
        groupId: data.groupId,
        name: data.name.trim(),
        location: data.location || null,
        defaultTime: data.defaultTime || null,
        playerIds: JSON.stringify(data.playerIds),
      },
    });
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    data: {
      name?: string;
      location?: string;
      defaultTime?: string;
      playerIds?: string[];
    }
  ) {
    if (data.name !== undefined && data.name.trim().length < 3) {
      throw new ValidationError('Template name must be at least 3 characters');
    }

    return prisma.sessionTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.location !== undefined && { location: data.location || null }),
        ...(data.defaultTime !== undefined && { defaultTime: data.defaultTime || null }),
        ...(data.playerIds && { playerIds: JSON.stringify(data.playerIds) }),
      },
    });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string) {
    return prisma.sessionTemplate.delete({
      where: { id },
    });
  }
}

export const templateService = new TemplateService();

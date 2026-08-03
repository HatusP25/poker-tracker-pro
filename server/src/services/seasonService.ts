import { prisma } from '../lib/prisma';
import { ValidationError } from '../utils/validators';
import { normaliseRange, findOverlap, currentSeason, type SeasonRow } from './seasonRules';

/**
 * CRUD for group-defined seasons.
 *
 * Additive by construction: a group with no seasons behaves exactly as it did
 * before, with Season Recap falling back to calendar years.
 */

const MAX_NAME = 40;

const assertName = (name: unknown): string => {
  if (typeof name !== 'string' || name.trim().length < 2) {
    throw new ValidationError('Season name must be at least 2 characters');
  }
  if (name.trim().length > MAX_NAME) {
    throw new ValidationError(`Season name must be ${MAX_NAME} characters or fewer`);
  }
  return name.trim();
};

export class SeasonService {
  /** Newest first — that's the order a season picker wants. */
  async getSeasonsByGroup(groupId: string) {
    return prisma.season.findMany({
      where: { groupId },
      orderBy: { startDate: 'desc' },
    });
  }

  /** The season covering `now`, or null when the group is between seasons. */
  async getCurrentSeason(groupId: string, now = new Date()) {
    const seasons = await this.getSeasonsByGroup(groupId);
    return currentSeason(seasons, now);
  }

  async createSeason(data: {
    groupId: string;
    name: string;
    startDate: string | Date;
    endDate: string | Date;
  }) {
    const name = assertName(data.name);
    const { start, end } = normaliseRange(data.startDate, data.endDate);

    await this.assertNoOverlap(data.groupId, { id: '', name, startDate: start, endDate: end });

    return prisma.season.create({
      data: { groupId: data.groupId, name, startDate: start, endDate: end },
    });
  }

  async updateSeason(
    id: string,
    data: { name?: string; startDate?: string | Date; endDate?: string | Date }
  ) {
    const existing = await prisma.season.findUnique({ where: { id } });
    if (!existing) {
      throw new ValidationError('Season not found');
    }

    const name = data.name !== undefined ? assertName(data.name) : existing.name;
    const { start, end } = normaliseRange(
      data.startDate ?? existing.startDate,
      data.endDate ?? existing.endDate
    );

    await this.assertNoOverlap(existing.groupId, { id, name, startDate: start, endDate: end });

    return prisma.season.update({
      where: { id },
      data: { name, startDate: start, endDate: end },
    });
  }

  /**
   * Deleting a season removes only the label. No session, entry or result is
   * touched — the nights it covered simply stop being grouped under that name.
   */
  async deleteSeason(id: string) {
    const existing = await prisma.season.findUnique({ where: { id } });
    if (!existing) {
      throw new ValidationError('Season not found');
    }
    return prisma.season.delete({ where: { id } });
  }

  private async assertNoOverlap(groupId: string, candidate: SeasonRow) {
    const existing = await prisma.season.findMany({ where: { groupId } });
    const clash = findOverlap(existing, candidate);
    if (clash) {
      throw new ValidationError(
        `That range overlaps "${clash.name}". Seasons can't share days, or a night ` +
          'would belong to two of them.'
      );
    }
  }
}

export const seasonService = new SeasonService();

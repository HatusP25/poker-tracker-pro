import { Request, Response, NextFunction } from 'express';
import { statsService } from '../services/statsService';
import { sessionSummaryService } from '../services/sessionSummaryService';
import { insightsService } from '../services/insightsService';
import { banterService } from '../services/banterService';
import { LeaderboardTimeframe } from '../types';

const VALID_LEADERBOARD_TIMEFRAMES: LeaderboardTimeframe[] = ['all', 'year', 'month', 'week'];

export const getPlayerStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const stats = await statsService.getPlayerStats(id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const minGames = req.query.minGames ? parseInt(req.query.minGames as string) : 0;
    const timeframeParam = (req.query.timeframe as string) || 'all';

    if (!VALID_LEADERBOARD_TIMEFRAMES.includes(timeframeParam as LeaderboardTimeframe)) {
      res.status(400).json({
        error: `Invalid timeframe. Must be one of: ${VALID_LEADERBOARD_TIMEFRAMES.join(', ')}`,
      });
      return;
    }

    const leaderboard = await statsService.getLeaderboard(
      groupId,
      minGames,
      timeframeParam as LeaderboardTimeframe
    );
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
};

export const getSessionStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const stats = await statsService.getSessionStats(id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const stats = await statsService.getDashboardStats(groupId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const checkSessionBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 1;
    const balanceCheck = await statsService.checkSessionBalance(id, threshold);
    res.json(balanceCheck);
  } catch (error) {
    next(error);
  }
};

export const getProfitTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
    const trend = await statsService.getProfitTrend(groupId, period);
    res.json(trend);
  } catch (error) {
    next(error);
  }
};

export const getPlayerStreaks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const streaks = await statsService.getPlayerStreaks(groupId);
    res.json(streaks);
  } catch (error) {
    next(error);
  }
};

export const getAggregatedStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const stats = await statsService.getAggregatedStats(groupId, year, month);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getPlayerPerformanceTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const trend = await statsService.getPlayerPerformanceTrend(playerId);
    res.json(trend);
  } catch (error) {
    next(error);
  }
};

export const getSessionSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { groupId } = req.query;

    if (!groupId || typeof groupId !== 'string') {
      res.status(400).json({ error: 'groupId query parameter is required' });
      return;
    }

    const summary = await sessionSummaryService.getSessionSummary(sessionId, groupId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

export const getGroupRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const records = await insightsService.getRecords(groupId);
    res.json(records);
  } catch (error) {
    next(error);
  }
};

export const getGroupHeadToHead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const playerA = typeof req.query.playerA === 'string' ? req.query.playerA : undefined;
    const playerB = typeof req.query.playerB === 'string' ? req.query.playerB : undefined;
    const result = await insightsService.getHeadToHead(groupId, playerA, playerB);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getGroupForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const form = await insightsService.getForm(groupId);
    res.json(form);
  } catch (error) {
    next(error);
  }
};

export const getSeasonRecap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const recap = await insightsService.getSeasonRecap(groupId, year);
    res.json(recap);
  } catch (error) {
    next(error);
  }
};

export const getGroupBelt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const belt = await banterService.getBelt(groupId);
    res.json(belt);
  } catch (error) {
    next(error);
  }
};

export const getGroupAchievements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const achievements = await banterService.getAchievements(groupId);
    res.json(achievements);
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { statsService } from '../services/statsService';
import { sessionSummaryService } from '../services/sessionSummaryService';

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
    const leaderboard = await statsService.getLeaderboard(groupId, minGames);
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

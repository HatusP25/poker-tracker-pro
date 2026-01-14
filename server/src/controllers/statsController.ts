import { Request, Response, NextFunction } from 'express';
import { statsService } from '../services/statsService';

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

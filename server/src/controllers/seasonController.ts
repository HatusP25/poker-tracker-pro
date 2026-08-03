import { Request, Response, NextFunction } from 'express';
import { seasonService } from '../services/seasonService';

export const getSeasonsByGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await seasonService.getSeasonsByGroup(req.params.groupId));
  } catch (error) {
    next(error);
  }
};

export const getCurrentSeason = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await seasonService.getCurrentSeason(req.params.groupId));
  } catch (error) {
    next(error);
  }
};

export const createSeason = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json(await seasonService.createSeason(req.body));
  } catch (error) {
    next(error);
  }
};

export const updateSeason = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await seasonService.updateSeason(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const deleteSeason = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await seasonService.deleteSeason(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

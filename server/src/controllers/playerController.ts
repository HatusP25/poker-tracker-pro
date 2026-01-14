import { Request, Response, NextFunction } from 'express';
import { playerService } from '../services/playerService';

export const getPlayersByGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const activeOnly = req.query.activeOnly === 'true';
    const players = await playerService.getPlayersByGroup(groupId, activeOnly);
    res.json(players);
  } catch (error) {
    next(error);
  }
};

export const getPlayerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const player = await playerService.getPlayerById(id);
    res.json(player);
  } catch (error) {
    next(error);
  }
};

export const createPlayer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const player = await playerService.createPlayer(req.body);
    res.status(201).json(player);
  } catch (error) {
    next(error);
  }
};

export const updatePlayer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const player = await playerService.updatePlayer(id, req.body);
    res.json(player);
  } catch (error) {
    next(error);
  }
};

export const togglePlayerActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const player = await playerService.toggleActive(id);
    res.json(player);
  } catch (error) {
    next(error);
  }
};

export const deletePlayer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await playerService.deletePlayer(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const searchPlayers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const query = req.query.q as string || '';
    const players = await playerService.searchPlayers(groupId, query);
    res.json(players);
  } catch (error) {
    next(error);
  }
};

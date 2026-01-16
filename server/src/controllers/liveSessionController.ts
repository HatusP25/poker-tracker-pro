import { Request, Response, NextFunction } from 'express';
import { liveSessionService } from '../services/liveSessionService';

export const startLiveSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId, date, startTime, location, players } = req.body;

    const session = await liveSessionService.startSession({
      groupId,
      date,
      startTime,
      location,
      players,
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

export const getLiveSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const result = await liveSessionService.getLiveSession(sessionId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const addRebuy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { playerId, amount } = req.body;

    const entry = await liveSessionService.addRebuy(sessionId, playerId, amount);

    res.json(entry);
  } catch (error) {
    next(error);
  }
};

export const addPlayer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { playerId, buyIn } = req.body;

    const entry = await liveSessionService.addPlayer(sessionId, playerId, buyIn);

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
};

export const endLiveSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { endTime, cashOuts } = req.body;

    const result = await liveSessionService.endSession(sessionId, {
      endTime,
      cashOuts,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const reopenLiveSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const session = await liveSessionService.reopenSession(sessionId);

    res.json(session);
  } catch (error) {
    next(error);
  }
};

export const getActiveSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;

    const sessions = await liveSessionService.getActiveSessions(groupId);

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/sessionService';

export const getSessionsByGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const includeDeleted = req.query.includeDeleted === 'true';
    const sessions = await sessionService.getSessionsByGroup(groupId, limit, includeDeleted);
    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = await sessionService.getSessionById(id);
    res.json(session);
  } catch (error) {
    next(error);
  }
};

export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await sessionService.createSession(req.body);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = await sessionService.updateSession(id, req.body);
    res.json(session);
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await sessionService.deleteSession(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateSessionEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entryId } = req.params;
    const entry = await sessionService.updateSessionEntry(entryId, req.body);
    res.json(entry);
  } catch (error) {
    next(error);
  }
};

export const deleteSessionEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entryId } = req.params;
    await sessionService.deleteSessionEntry(entryId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addSessionEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const entry = await sessionService.addSessionEntry(sessionId, req.body);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
};

export const restoreSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = await sessionService.restoreSession(id);
    res.json(session);
  } catch (error) {
    next(error);
  }
};

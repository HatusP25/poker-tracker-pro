import { Request, Response, NextFunction } from 'express';
import { groupService } from '../services/groupService';

export const getAllGroups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const groups = await groupService.getAllGroups();
    res.json(groups);
  } catch (error) {
    next(error);
  }
};

export const getGroupById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const group = await groupService.getGroupById(id);
    res.json(group);
  } catch (error) {
    next(error);
  }
};

export const createGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = await groupService.createGroup(req.body);
    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
};

export const updateGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const group = await groupService.updateGroup(id, req.body);
    res.json(group);
  } catch (error) {
    next(error);
  }
};

export const deleteGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await groupService.deleteGroup(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

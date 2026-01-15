import { Request, Response, NextFunction } from 'express';
import { templateService } from '../services/templateService';

export const getTemplatesByGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const templates = await templateService.getTemplatesByGroup(groupId);
    res.json(templates);
  } catch (error) {
    next(error);
  }
};

export const getTemplateById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const template = await templateService.getTemplateById(id);
    res.json(template);
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = await templateService.createTemplate(req.body);
    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const template = await templateService.updateTemplate(id, req.body);
    res.json(template);
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await templateService.deleteTemplate(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

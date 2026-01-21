import { Request, Response, NextFunction } from 'express';
import { backupService } from '../services/backupService';

export const exportDatabase = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const backup = await backupService.exportDatabase();

    // Set headers for file download
    const filename = `poker-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json(backup);
  } catch (error) {
    next(error);
  }
};

export const validateBackup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const backup = req.body;
    const validation = backupService.validateBackup(backup);
    res.json(validation);
  } catch (error) {
    next(error);
  }
};

export const importDatabase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { backup, options } = req.body;

    // Validate backup first
    const validation = backupService.validateBackup(backup);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid backup file',
        details: validation.errors,
      });
      return;
    }

    // Import with options
    const report = await backupService.importDatabase(backup, options);

    if (!report.success) {
      res.status(400).json({
        error: 'Import failed',
        report,
      });
      return;
    }

    res.json({
      message: 'Import completed successfully',
      report,
    });
  } catch (error) {
    next(error);
  }
};

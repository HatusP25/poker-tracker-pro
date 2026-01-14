import { Router } from 'express';
import * as backupController from '../controllers/backupController';

const router = Router();

/**
 * GET /api/backup/export
 * Export entire database as JSON
 */
router.get('/export', backupController.exportDatabase);

/**
 * POST /api/backup/validate
 * Validate backup file structure
 */
router.post('/validate', backupController.validateBackup);

/**
 * POST /api/backup/import
 * Import backup file into database
 */
router.post('/import', backupController.importDatabase);

export default router;

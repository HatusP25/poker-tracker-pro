import { Router } from 'express';
import * as backupController from '../controllers/backupController';

const router = Router();

/**
 * GET /api/backup/export
 * Export every group as JSON (backup format v2).
 */
router.get('/export', backupController.exportDatabase);

/**
 * GET /api/backup/export/:groupId
 * Export a single group. Restoring this file in "replace" mode only ever
 * deletes within that group — other groups are untouched.
 */
router.get('/export/:groupId', backupController.exportDatabase);

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

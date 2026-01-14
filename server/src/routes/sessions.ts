import { Router } from 'express';
import {
  getSessionsByGroup,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  updateSessionEntry,
  deleteSessionEntry,
  addSessionEntry,
  restoreSession,
} from '../controllers/sessionController';

const router = Router();

// Group sessions
router.get('/groups/:groupId/sessions', getSessionsByGroup);

// Individual sessions
router.get('/:id', getSessionById);
router.post('/', createSession);
router.patch('/:id', updateSession);
router.delete('/:id', deleteSession);
router.patch('/:id/restore', restoreSession);

// Session entries
router.post('/:sessionId/entries', addSessionEntry);
router.patch('/entries/:entryId', updateSessionEntry);
router.delete('/entries/:entryId', deleteSessionEntry);

export default router;

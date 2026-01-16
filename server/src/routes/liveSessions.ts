import { Router } from 'express';
import {
  startLiveSession,
  getLiveSession,
  addRebuy,
  addPlayer,
  endLiveSession,
  reopenLiveSession,
  getActiveSessions,
} from '../controllers/liveSessionController';

const router = Router();

// Start a new live session
router.post('/start', startLiveSession);

// Get live session details
router.get('/:sessionId', getLiveSession);

// Add rebuy to existing player
router.post('/:sessionId/rebuy', addRebuy);

// Add new player mid-game
router.post('/:sessionId/add-player', addPlayer);

// End session and calculate settlements
router.post('/:sessionId/end', endLiveSession);

// Reopen completed session for editing
router.post('/:sessionId/reopen', reopenLiveSession);

// Get active (in-progress) sessions for a group
router.get('/groups/:groupId/active', getActiveSessions);

export default router;

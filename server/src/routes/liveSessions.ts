import { Router } from 'express';
import {
  startLiveSession,
  getLiveSession,
  addRebuy,
  updateRebuy,
  deleteRebuy,
  addPlayer,
  cashOutPlayer,
  undoCashOut,
  endLiveSession,
  reopenLiveSession,
  getActiveSessions,
  forceEndLiveSession,
} from '../controllers/liveSessionController';

const router = Router();

// Start a new live session
router.post('/start', startLiveSession);

// Get live session details
router.get('/:sessionId', getLiveSession);

// Add rebuy to existing player
router.post('/:sessionId/rebuy', addRebuy);

// Edit or undo a rebuy
router.patch('/:sessionId/rebuys/:rebuyId', updateRebuy);
router.delete('/:sessionId/rebuys/:rebuyId', deleteRebuy);

// Add new player mid-game
router.post('/:sessionId/add-player', addPlayer);

// Cash a player out early (they left before the night ended), and undo that
router.post('/:sessionId/cash-out', cashOutPlayer);
router.delete('/:sessionId/cash-out/:playerId', undoCashOut);

// End session and calculate settlements
router.post('/:sessionId/end', endLiveSession);

// Force-end session without cash-outs (emergency use)
router.post('/:sessionId/force-end', forceEndLiveSession);

// Reopen completed session for editing
router.post('/:sessionId/reopen', reopenLiveSession);

// Get active (in-progress) sessions for a group
router.get('/groups/:groupId/active', getActiveSessions);

export default router;

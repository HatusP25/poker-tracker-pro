import { Router } from 'express';
import {
  getPlayerStats,
  getLeaderboard,
  getSessionStats,
  getDashboardStats,
  checkSessionBalance,
} from '../controllers/statsController';

const router = Router();

// Player stats
router.get('/players/:id/stats', getPlayerStats);

// Group leaderboard
router.get('/groups/:groupId/leaderboard', getLeaderboard);

// Session stats
router.get('/sessions/:id/stats', getSessionStats);

// Dashboard stats
router.get('/groups/:groupId/dashboard', getDashboardStats);

// Session balance check
router.get('/sessions/:id/balance-check', checkSessionBalance);

export default router;

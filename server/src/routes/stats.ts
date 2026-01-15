import { Router } from 'express';
import {
  getPlayerStats,
  getLeaderboard,
  getSessionStats,
  getDashboardStats,
  checkSessionBalance,
  getProfitTrend,
  getPlayerStreaks,
  getAggregatedStats,
  getPlayerPerformanceTrend,
} from '../controllers/statsController';

const router = Router();

// Player stats
router.get('/players/:id/stats', getPlayerStats);
router.get('/players/:playerId/performance-trend', getPlayerPerformanceTrend);

// Group leaderboard
router.get('/groups/:groupId/leaderboard', getLeaderboard);

// Session stats
router.get('/sessions/:id/stats', getSessionStats);

// Dashboard stats
router.get('/groups/:groupId/dashboard', getDashboardStats);

// Session balance check
router.get('/sessions/:id/balance-check', checkSessionBalance);

// Trend endpoints
router.get('/groups/:groupId/trends', getProfitTrend);
router.get('/groups/:groupId/streaks', getPlayerStreaks);
router.get('/groups/:groupId/aggregates', getAggregatedStats);

export default router;

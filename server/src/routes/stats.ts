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
  getSessionSummary,
  getGroupRecords,
  getGroupHeadToHead,
  getGroupForm,
  getSeasonRecap,
  getGroupBelt,
  getGroupAchievements,
} from '../controllers/statsController';

const router = Router();

// Player stats
router.get('/players/:id/stats', getPlayerStats);
router.get('/players/:playerId/performance-trend', getPlayerPerformanceTrend);

// Group leaderboard
router.get('/groups/:groupId/leaderboard', getLeaderboard);

// Session stats
router.get('/sessions/:id/stats', getSessionStats);
router.get('/sessions/:sessionId/summary', getSessionSummary);

// Dashboard stats
router.get('/groups/:groupId/dashboard', getDashboardStats);

// Session balance check
router.get('/sessions/:id/balance-check', checkSessionBalance);

// Trend endpoints
router.get('/groups/:groupId/trends', getProfitTrend);
router.get('/groups/:groupId/streaks', getPlayerStreaks);
router.get('/groups/:groupId/aggregates', getAggregatedStats);

// Insights endpoints
router.get('/groups/:groupId/records', getGroupRecords);
router.get('/groups/:groupId/head-to-head', getGroupHeadToHead);
router.get('/groups/:groupId/form', getGroupForm);
router.get('/groups/:groupId/season', getSeasonRecap);

// Banter pack endpoints
router.get('/groups/:groupId/belt', getGroupBelt);
router.get('/groups/:groupId/achievements', getGroupAchievements);

export default router;

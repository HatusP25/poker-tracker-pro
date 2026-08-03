import { Router } from 'express';
import {
  getSeasonsByGroup,
  getCurrentSeason,
  createSeason,
  updateSeason,
  deleteSeason,
} from '../controllers/seasonController';

const router = Router();

router.get('/groups/:groupId/seasons', getSeasonsByGroup);
router.get('/groups/:groupId/seasons/current', getCurrentSeason);
router.post('/', createSeason);
router.patch('/:id', updateSeason);
router.delete('/:id', deleteSeason);

export default router;

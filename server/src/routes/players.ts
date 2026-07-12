import { Router } from 'express';
import {
  getPlayersByGroup,
  getPlayerById,
  createPlayer,
  updatePlayer,
  togglePlayerActive,
  deletePlayer,
  searchPlayers,
  getPlayerNotes,
  createPlayerNote,
  updatePlayerNote,
  deletePlayerNote,
} from '../controllers/playerController';

const router = Router();

// Group players
router.get('/groups/:groupId/players', getPlayersByGroup);
router.get('/groups/:groupId/players/search', searchPlayers);

// Individual players
router.get('/:id', getPlayerById);
router.post('/', createPlayer);
router.patch('/:id', updatePlayer);
router.patch('/:id/toggle-active', togglePlayerActive);
router.delete('/:id', deletePlayer);

// Player notes
router.get('/:playerId/notes', getPlayerNotes);
router.post('/:playerId/notes', createPlayerNote);
router.patch('/notes/:noteId', updatePlayerNote);
router.delete('/notes/:noteId', deletePlayerNote);

export default router;

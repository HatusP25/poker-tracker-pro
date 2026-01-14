import { Router } from 'express';
import {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../controllers/groupController';

const router = Router();

router.get('/', getAllGroups);
router.get('/:id', getGroupById);
router.post('/', createGroup);
router.patch('/:id', updateGroup);
router.delete('/:id', deleteGroup);

export default router;

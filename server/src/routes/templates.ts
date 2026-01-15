import { Router } from 'express';
import {
  getTemplatesByGroup,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/templateController';

const router = Router();

router.get('/groups/:groupId/templates', getTemplatesByGroup);
router.get('/:id', getTemplateById);
router.post('/', createTemplate);
router.patch('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;

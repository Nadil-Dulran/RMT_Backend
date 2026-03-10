import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup
} from '../controllers/groupsController';

const router = Router();

router.post('/', authenticateToken, createGroup);
router.get('/', authenticateToken, getGroups);
router.get('/:id', authenticateToken, getGroupById);
router.patch('/:id', authenticateToken, updateGroup);
router.delete('/:id', authenticateToken, deleteGroup);

export default router;

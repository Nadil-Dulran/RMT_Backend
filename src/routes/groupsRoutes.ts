import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  getMembers,
  removeMember
} from '../controllers/groupsController';

const router = Router();

router.post('/', authenticateToken, createGroup);
router.get('/', authenticateToken, getGroups);
router.get('/:id', authenticateToken, getGroupById);
router.patch('/:id', authenticateToken, updateGroup);
router.delete('/:id', authenticateToken, deleteGroup);

router.post('/:id/members', authenticateToken, addMember);
router.get('/:id/members', authenticateToken, getMembers);
router.delete('/:id/members/:userId', authenticateToken, removeMember);


export default router;

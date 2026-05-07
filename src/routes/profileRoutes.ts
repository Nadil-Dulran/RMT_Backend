import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { deleteAccount, getProfile, updateProfile } from '../controllers/profileController';

const router = Router();

router.get('/', authenticateToken, getProfile);
router.patch('/', authenticateToken, updateProfile);
router.delete('/', authenticateToken, deleteAccount);

export default router;

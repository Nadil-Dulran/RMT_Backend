import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { getProfile, updateProfile } from '../controllers/profileController';

const router = Router();

router.get('/', authenticateToken, getProfile);
router.patch('/', authenticateToken, updateProfile);

export default router;

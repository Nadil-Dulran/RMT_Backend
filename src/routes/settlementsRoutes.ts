import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  createSettlement,
  getSettlements
} from '../controllers/settlementsController';

const router = Router();

router.post('/', authenticateToken, createSettlement);
router.get('/', authenticateToken, getSettlements);

export default router;
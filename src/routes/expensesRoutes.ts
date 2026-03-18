import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense
} from '../controllers/expensesController';

const router = Router();

router.post('/', authenticateToken, createExpense);
router.get('/', authenticateToken, getExpenses);
router.patch('/:id', authenticateToken, updateExpense);
router.delete('/:id', authenticateToken, deleteExpense);

export default router;
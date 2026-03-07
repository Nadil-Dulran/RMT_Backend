import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/profile', authenticateToken, (req: any, res) => {

  res.json({
    message: 'Protected route',
    userId: req.userId
  });

});

export default router;

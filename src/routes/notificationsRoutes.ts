import express from 'express';
import {
	listNotifications,
	purgeReadNotificationsForUser,
	readAllNotifications,
	readNotification,
	subscribe
} from '../controllers/notificationsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authenticateToken, listNotifications);
router.get('/subscribe', authenticateToken, subscribe);
router.delete('/purge-read', authenticateToken, purgeReadNotificationsForUser);
router.patch('/read-all', authenticateToken, readAllNotifications);
router.patch('/:id/read', authenticateToken, readNotification);

export default router;
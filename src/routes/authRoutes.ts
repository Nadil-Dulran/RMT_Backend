import { Router } from 'express';
import {
	register,
	login,
	requestPasswordResetCode,
	verifyPasswordResetCode,
	resetPassword,
} from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password/request-code', requestPasswordResetCode);
router.post('/forgot-password/verify-code', verifyPasswordResetCode);
router.post('/forgot-password/reset', resetPassword);

export default router;

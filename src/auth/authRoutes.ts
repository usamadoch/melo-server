import { Router } from 'express';
import { AuthController } from './authController.js';
import { requireAuth } from './authMiddleware.js';

const router = Router();

router.post('/google', AuthController.googleAuth);
router.get('/me', requireAuth, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;

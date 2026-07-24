import { Router } from 'express';
import { ProfileController } from './profileController.js';
import { requireAuth } from '../auth/authMiddleware.js';

const router = Router();

router.post('/', requireAuth, ProfileController.createProfile);
router.get('/me', requireAuth, ProfileController.getMyProfile);
router.patch('/', requireAuth, ProfileController.updateProfile);

export default router;

import express from 'express';
import { submitMatchFeedback, submitActivityMetrics, checkModeration } from './feedbackController.js';
import { requireAuth } from '../auth/authMiddleware.js';

const router = express.Router();

router.post('/match', requireAuth, submitMatchFeedback);
router.post('/activity', requireAuth, submitActivityMetrics);
router.post('/moderation/check', requireAuth, checkModeration);

export default router;

import express from 'express';
import { submitMatchFeedback } from './feedbackController.js';
import { requireAuth } from '../auth/authMiddleware.js';

const router = express.Router();

router.post('/match', requireAuth, submitMatchFeedback);

export default router;

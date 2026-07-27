import { Router } from 'express';
import { ReportsController } from './reportsController.js';
import { requireAuth } from '../auth/authMiddleware.js';

const router = Router();

router.post('/', requireAuth, ReportsController.createReport);

export default router;

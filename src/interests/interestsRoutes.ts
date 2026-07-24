import { Router } from 'express';
import { InterestsController } from './interestsController.js';

const router = Router();

router.get('/', InterestsController.getInterests);

export default router;

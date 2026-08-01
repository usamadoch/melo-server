import type { Request, Response, NextFunction } from 'express';
import { InterestsService } from './interestsService.js';

export class InterestsController {
  static getInterests(req: Request, res: Response, next: NextFunction): void {
    try {
      const categories = InterestsService.getCategories();
      res.json({ categories });
    } catch (error) {
      next(error);
    }
  }
}

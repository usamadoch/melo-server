import type { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reportsService.js';
import { UnauthorizedError, BadRequestError } from '../errors/appError.js';

export class ReportsController {
  static async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }
      
      const { reportedUserId, reason, text, matchType } = req.body;
      
      if (!reportedUserId || !reason || !matchType) {
        throw new BadRequestError('Missing required report fields');
      }

      const report = await ReportsService.createReport(req.user._id as string, {
        reportedUserId,
        reason,
        text,
        matchType
      });
      
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  }
}

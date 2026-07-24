import type { Request, Response, NextFunction } from 'express';
import { ProfileService } from './profileService.js';
import { UnauthorizedError } from '../errors/appError.js';

export class ProfileController {
  static async createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }
      const profile = await ProfileService.createProfile(req.user._id as string, req.body);
      res.status(201).json(profile);
    } catch (error) {
      next(error);
    }
  }

  static async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }
      const profile = await ProfileService.getProfileByUserId(req.user._id as string);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }
      const profile = await ProfileService.updateProfile(req.user._id as string, req.body);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
}

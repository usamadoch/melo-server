import type { Request, Response, NextFunction } from 'express';
import { ProfileService } from './profileService.js';
import { UnauthorizedError } from '../errors/appError.js';
import { getOnlineUserIds } from '../sockets/onlineUsersManager.js';

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

  static async getExploreProfiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }
      const onlineUserIds = getOnlineUserIds();
      
      // For testing purposes, we allow you to see yourself on the explore page.
      // In production, we'd uncomment this to hide the current user:
      // const otherUserIds = onlineUserIds.filter(id => id !== req.user?._id.toString());
      
      const data = await ProfileService.getExploreData(onlineUserIds);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }
      const { userId } = req.params;
      const data = await ProfileService.getPublicProfileData(userId as string);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  static async getUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }
      const fileType = (req.query.fileType as string) || 'image/jpeg';
      const data = await ProfileService.getUploadUrl(req.user._id as string, fileType);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

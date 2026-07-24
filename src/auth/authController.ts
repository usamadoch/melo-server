import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './authService.js';
import { BadRequestError, UnauthorizedError } from '../errors/appError.js';

export class AuthController {
  static async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { credential } = req.body;
      if (!credential) {
        throw new BadRequestError('Google credential is required');
      }

      const result = await AuthService.authenticateWithGoogle(credential as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }
      res.json(req.user);
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}

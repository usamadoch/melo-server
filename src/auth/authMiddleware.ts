import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from './authService.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/appError.js';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Invalid token format');
    }

    const secret = env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    
    if (!decoded || typeof decoded !== 'object' || !decoded.userId) {
      throw new UnauthorizedError('Invalid token signature');
    }

    const user = await AuthService.getUserById(decoded.userId as string);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid token'));
  }
};

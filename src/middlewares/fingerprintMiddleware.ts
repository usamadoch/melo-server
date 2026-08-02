import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { UserFingerprint } from '../models/UserFingerprint.js';

export const captureFingerprint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    return next();
  }

  try {
    const rawIp = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const rawDevice = req.headers['x-device-id'] || req.headers['user-agent'] || 'unknown-device';

    // Simple robust hashing (privacy conscious)
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex');
    const deviceHash = crypto.createHash('sha256').update(rawDevice as string).digest('hex');

    await UserFingerprint.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          ipHash,
          deviceHash,
          lastSeen: new Date()
        }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Failed to capture fingerprint:', error);
  }

  next();
};

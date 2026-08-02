import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../users/userRepository.js';
import { env } from '../config/env.js';
import { type IUser } from '../models/User.js';
import { BadRequestError } from '../errors/appError.js';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface AuthResponse {
  token: string;
  user: IUser;
  onboardingCompleted: boolean;
}

export class AuthService {
  static async authenticateWithGoogle(credential: string): Promise<AuthResponse> {
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      throw new BadRequestError('Failed to verify Google token');
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new BadRequestError('Invalid Google token payload');
    }

    let user = await UserRepository.findByGoogleId(payload.sub);

    if (!user) {
      user = await UserRepository.create({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || 'Anonymous',
        avatar: payload.picture || '',
        isVerified: payload.email_verified || false,
        onboardingCompleted: false,
      });

      // Hook: Trigger initial trust score generation (Trust Bootstrap)
      import('../ratings/trustScoreService.js').then(({ updateTrustScoreForUser }) => {
        updateTrustScoreForUser(user!._id).catch(err => {
          console.error(`Failed to generate initial trust score for user ${user!._id}:`, err);
        });
      });
    }

    if (!user) {
      throw new BadRequestError('Failed to create or retrieve user');
    }

    const secret = env.JWT_SECRET as string;
    const token = jwt.sign({ userId: user._id }, secret, { expiresIn: '7d' });

    return {
      token,
      user,
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  static async getUserById(userId: string): Promise<IUser | null> {
    return UserRepository.findById(userId);
  }
}

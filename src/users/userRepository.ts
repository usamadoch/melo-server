import { User, type IUser } from '../models/User.js';

export class UserRepository {
  static async findByGoogleId(googleId: string): Promise<IUser | null> {
    return User.findOne({ googleId }).exec();
  }

  static async findById(id: string): Promise<IUser | null> {
    return User.findById(id).exec();
  }

  static async create(userData: {
    googleId: string;
    email: string;
    name: string;
    avatar: string;
    isVerified: boolean;
    onboardingCompleted: boolean;
  }): Promise<IUser> {
    return User.create(userData);
  }

  static async updateOnboardingCompleted(id: string, onboardingCompleted: boolean): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { onboardingCompleted }, { new: true }).exec();
  }
}

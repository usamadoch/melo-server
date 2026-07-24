import { Profile, type IProfile } from '../models/Profile.js';

export interface CreateProfileData {
  userId: string;
  bio?: string;
  conversationTitle?: string;
  interests: string[];
  showOnExplore: boolean;
  allowRandomMatching: boolean;
}

export interface UpdateProfileData {
  bio?: string;
  conversationTitle?: string;
  interests?: string[];
  showOnExplore?: boolean;
  allowRandomMatching?: boolean;
}

export class ProfileRepository {
  static async findByUserId(userId: string): Promise<IProfile | null> {
    return Profile.findOne({ userId }).exec();
  }

  static async create(profileData: CreateProfileData): Promise<IProfile> {
    return Profile.create(profileData);
  }

  static async update(userId: string, profileData: UpdateProfileData): Promise<IProfile | null> {
    return Profile.findOneAndUpdate(
      { userId },
      profileData,
      { new: true, runValidators: true }
    ).exec();
  }
}

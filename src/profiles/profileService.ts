import { ProfileRepository, type CreateProfileData, type UpdateProfileData } from './profileRepository.js';
import { UserRepository } from '../users/userRepository.js';
import { type IProfile } from '../models/Profile.js';
import { BadRequestError, NotFoundError } from '../errors/appError.js';

export class ProfileService {
  static async createProfile(userId: string, profileData: Omit<CreateProfileData, 'userId'>): Promise<IProfile> {
    const existingProfile = await ProfileRepository.findByUserId(userId);
    if (existingProfile) {
      throw new BadRequestError('Profile already exists');
    }

    const profile = await ProfileRepository.create({
      userId,
      ...profileData,
    });

    await UserRepository.updateOnboardingCompleted(userId, true);
    return profile;
  }

  static async getProfileByUserId(userId: string): Promise<IProfile> {
    const profile = await ProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }
    return profile;
  }

  static async updateProfile(userId: string, profileData: UpdateProfileData): Promise<IProfile> {
    const profile = await ProfileRepository.update(userId, profileData);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }
    return profile;
  }

  static async getExploreData(onlineUserIds: string[]) {
    return ProfileRepository.getExploreData(onlineUserIds);
  }

  static async getPublicProfileData(userId: string) {
    const profile = await ProfileRepository.findByUserId(userId);
    const user = await UserRepository.findById(userId);
    
    if (!profile || !user) {
      throw new NotFoundError('Profile not found');
    }

    return {
      id: userId,
      name: user.name,
      avatar: user.avatar,
      bio: profile.bio,
      conversationTitle: profile.conversationTitle,
      interests: profile.interests
    };
  }
}

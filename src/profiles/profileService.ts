import { ProfileRepository, type CreateProfileData, type UpdateProfileData } from './profileRepository.js';
import { UserRepository } from '../users/userRepository.js';
import { type IProfile } from '../models/Profile.js';
import { BadRequestError, NotFoundError } from '../errors/appError.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../utils/s3.js';
import { env } from '../config/env.js';

export class ProfileService {
  static async getUploadUrl(userId: string, fileType: string) {
    if (!env.S3_BUCKET_NAME) {
      throw new BadRequestError('S3 storage is not configured');
    }

    const key = `thumbnails/${userId}-${Date.now()}.jpg`;
    
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    const publicUrl = env.S3_ENDPOINT 
      ? `${env.S3_ENDPOINT}/${env.S3_BUCKET_NAME}/${key}`
      : `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

    return { uploadUrl, publicUrl };
  }
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

import mongoose from 'mongoose';
import { Profile, type IProfile } from '../models/Profile.js';

export interface CreateProfileData {
  userId: string;

  categories: string[];
  subcategories: string[];
  freeTextInterest?: string;
  interestVector?: number[];
  showOnExplore: boolean;
  allowRandomMatching: boolean;
}

export interface UpdateProfileData {

  categories?: string[];
  subcategories?: string[];
  freeTextInterest?: string;
  interestVector?: number[];
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
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  static async getExploreData(onlineUserIds: string[]): Promise<{ users: any[], categories: string[] }> {
    const objectIds = onlineUserIds.map(id => new mongoose.Types.ObjectId(id));
    
    const result = await Profile.aggregate([
      {
        $match: {
          userId: { $in: objectIds },
          showOnExplore: true
        }
      },
      {
        $lookup: {
          from: 'users', // Note: collection names are usually pluralized lowercase
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $facet: {
          users: [
            {
              $project: {
                _id: 0,
                id: '$userId',
                name: '$user.name',
                avatar: '$user.avatar',

                categories: 1,
                subcategories: 1,
                freeTextInterest: 1,
                exploreThumbnail: 1
              }
            }
          ],
          categories: [
            { $unwind: '$categories' },
            { $group: { _id: '$categories' } },
            { $project: { _id: 0, category: '$_id' } }
          ]
        }
      }
    ]);

    const data = result[0] || { users: [], categories: [] };
    
    return {
      users: data.users,
      categories: data.categories.map((c: any) => c.category)
    };
  }
}

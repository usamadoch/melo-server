import { UserFingerprint, type IUserFingerprint } from '../models/UserFingerprint.js';

export class UserFingerprintRepository {
  static async findByUserIds(userIds: string[]): Promise<IUserFingerprint[]> {
    return UserFingerprint.find({ userId: { $in: userIds } }).lean();
  }
}

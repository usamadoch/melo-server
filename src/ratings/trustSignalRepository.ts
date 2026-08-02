import mongoose from 'mongoose';
import { TrustSignal, type ITrustSignal } from '../models/TrustSignal.js';

export class TrustSignalRepository {
  static async findByUserId(userId: mongoose.Types.ObjectId | string): Promise<ITrustSignal | null> {
    return TrustSignal.findOne({ userId });
  }

  static async upsertTrustSignal(userId: mongoose.Types.ObjectId | string, updateData: Partial<ITrustSignal>): Promise<void> {
    await TrustSignal.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { upsert: true, new: true }
    );
  }

  static async updateRepeatConnectionScore(userId: mongoose.Types.ObjectId | string, score: number): Promise<void> {
    await TrustSignal.updateOne({ userId }, { $set: { repeatConnectionScore: score } });
  }
}

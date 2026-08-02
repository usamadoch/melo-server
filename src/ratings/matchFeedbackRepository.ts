import mongoose from 'mongoose';
import { MatchFeedback, type IMatchFeedback } from '../models/MatchFeedback.js';

export class MatchFeedbackRepository {
  static async countUserConversations(userId: mongoose.Types.ObjectId): Promise<number> {
    const totalConversationsAggr = await MatchFeedback.aggregate([
      { $match: { $or: [{ fromUserId: userId }, { toUserId: userId }] } },
      { $group: { _id: '$matchId' } },
      { $count: 'total' }
    ]);
    return totalConversationsAggr.length > 0 ? totalConversationsAggr[0].total : 0;
  }

  static async aggregateUserFeedbackStats(userId: mongoose.Types.ObjectId): Promise<{ likesCount: number; dislikesCount: number }> {
    const feedbackStats = await MatchFeedback.aggregate([
      {
        $match: {
          toUserId: userId,
          finalized: true,
          ignoredInTrustScore: false,
          currentState: { $in: ['LIKE', 'DISLIKE'] }
        }
      },
      {
        $group: {
          _id: null,
          likesCount: {
            $sum: { $cond: [{ $eq: ['$currentState', 'LIKE'] }, 1, 0] }
          },
          dislikesCount: {
            $sum: { $cond: [{ $eq: ['$currentState', 'DISLIKE'] }, 1, 0] }
          }
        }
      }
    ]);

    if (feedbackStats.length > 0) {
      return {
        likesCount: feedbackStats[0].likesCount,
        dislikesCount: feedbackStats[0].dislikesCount
      };
    }
    return { likesCount: 0, dislikesCount: 0 };
  }

  static async findFinalizedFeedbacks(): Promise<IMatchFeedback[]> {
    return MatchFeedback.find({ finalized: true }).lean();
  }

  static async suppressSybilEdges(u1: string, u2: string): Promise<void> {
    await MatchFeedback.updateMany(
      {
        $or: [
          { fromUserId: u1, toUserId: u2 },
          { fromUserId: u2, toUserId: u1 }
        ]
      },
      { $set: { ignoredInTrustScore: true } }
    );
  }
}

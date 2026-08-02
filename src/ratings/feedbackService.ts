import { MatchFeedback } from '../models/MatchFeedback.js';
import { updateTrustScoreForUser } from './trustScoreService.js';

export const finalizeMatch = async (roomId: string): Promise<void> => {
  try {
    if (!roomId) return;
    
    const feedbacksToFinalize = await MatchFeedback.find({ matchId: roomId, finalized: false });
    if (feedbacksToFinalize.length === 0) return;

    // Mark them as finalized
    await MatchFeedback.updateMany(
      { matchId: roomId, finalized: false },
      { $set: { finalized: true } }
    );

    // Extract unique users who received feedback (toUserId)
    const usersToUpdate = new Set<string>();
    for (const feedback of feedbacksToFinalize) {
      if (feedback.currentState === 'LIKE' || feedback.currentState === 'DISLIKE') {
        usersToUpdate.add(feedback.toUserId.toString());
      }
    }

    // Trigger inline recalculation
    for (const userId of usersToUpdate) {
      updateTrustScoreForUser(userId).catch(err => {
        console.error(`Error updating trust score for user ${userId}:`, err);
      });
    }
  } catch (error) {
    console.error('Error finalizing match feedback:', error);
  }
};

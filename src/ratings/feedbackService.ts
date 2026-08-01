import { MatchFeedback } from '../models/MatchFeedback.js';

export const finalizeMatch = async (roomId: string): Promise<void> => {
  try {
    if (!roomId) return;
    
    // Find all non-finalized feedback records for this matchId and mark them as finalized.
    // If they were 'NONE', they will just stay 'NONE' but finalized = true.
    await MatchFeedback.updateMany(
      { matchId: roomId, finalized: false },
      { $set: { finalized: true } }
    );
  } catch (error) {
    console.error('Error finalizing match feedback:', error);
  }
};

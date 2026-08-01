import type { Request, Response } from 'express';
import { MatchFeedback } from '../models/MatchFeedback.js';
import { Report } from '../models/Report.js';
import mongoose from 'mongoose';

export const submitMatchFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId; // assuming auth middleware attaches this
    const { matchId, toUserId, source, currentState, reasonCode } = req.body;

    if (!matchId || !toUserId || !source || !currentState) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Upsert the feedback record
    const updatedFeedback = await MatchFeedback.findOneAndUpdate(
      { matchId, fromUserId: userId },
      {
        toUserId,
        source,
        currentState,
        reasonCode: reasonCode || null,
      },
      { returnDocument: 'after', upsert: true }
    );

    // Immediate safety-net trigger
    if (reasonCode === 'NUDITY_INAPPROPRIATE' || reasonCode === 'HARASSMENT') {
      // Create a report behind the scenes without interrupting the user flow
      const reportReason = reasonCode === 'NUDITY_INAPPROPRIATE' ? 'nudity' : 'harassment';
      
      const newReport = new Report({
        reporterId: userId,
        reportedUserId: toUserId,
        reason: reportReason,
        matchType: 'current',
        text: `Auto-generated from live dislike widget. Reason: ${reasonCode}`
      });
      await newReport.save();
    }

    res.status(200).json({ success: true, feedback: updatedFeedback });
  } catch (error) {
    console.error('Error in submitMatchFeedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

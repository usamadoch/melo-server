import { ConversationActivity } from '../models/ConversationActivity.js';
import { TrustSignal } from '../models/TrustSignal.js';

export interface ActivityMetricsPayload {
  conversationId: string;
  durationSeconds: number;
  messageCount: number;
  audioActiveRatio: number;
  videoMotionRatio: number;
  turnTakingScore: number;
}

export class ActivityService {
  /**
   * Processes end-of-call metrics, stores them, and updates the user's duration signal.
   * A call's effective duration is multiplied by its engagement score to prevent mute-farming.
   */
  static async processCallActivity(userId: string, metrics: ActivityMetricsPayload): Promise<void> {
    
    // Save raw metrics
    await ConversationActivity.create({
      conversationId: metrics.conversationId,
      userId,
      durationSeconds: metrics.durationSeconds,
      messageCount: metrics.messageCount,
      audioActiveRatio: metrics.audioActiveRatio,
      videoMotionRatio: metrics.videoMotionRatio,
      turnTakingScore: metrics.turnTakingScore
    });

    // Compute Engagement Score
    // Weightings can be tuned later. Example: 
    // audio is highly weighted, turn taking is highly weighted.
    // Text message count has a diminishing return.
    const messageWeight = Math.min(1.0, metrics.messageCount / 20.0) * 0.2; 
    const audioWeight = Math.min(1.0, metrics.audioActiveRatio) * 0.5;
    const turnWeight = Math.min(1.0, metrics.turnTakingScore) * 0.3;
    
    // If video is present, it acts as a bonus multiplier or replaces audio weight depending on app type.
    // For now we'll just add it into the mix and cap at 1.0.
    const rawEngagement = messageWeight + audioWeight + turnWeight + (metrics.videoMotionRatio * 0.2);
    
    // Capped between 0.1 (minimum credit for just connecting) and 1.0
    const engagementScore = Math.max(0.1, Math.min(1.0, rawEngagement));

    // The true signal value we feed into trust
    const effectiveDuration = metrics.durationSeconds * engagementScore;

    // Update TrustSignal's durationSignalDecayed by adding the effectiveDuration
    // (A background job would be responsible for decaying this value over time)
    await TrustSignal.findOneAndUpdate(
      { userId },
      { $inc: { durationSignalDecayed: effectiveDuration } },
      { upsert: true }
    );
  }
}

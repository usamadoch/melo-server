import OpenAI from 'openai';
import { ModerationEvent } from '../models/ModerationEvent.js';
import { getSeverityTier, SeverityTier } from '../config/severityMap.js';
import { TrustSignal } from '../models/TrustSignal.js';
import { User } from '../models/User.js';
import { AdminNotificationService } from '../admin/adminNotificationService.js';

// Initialize OpenAI conditionally, it will fail if OPENAI_API_KEY is not set.
// You'll need to add it to .env
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export class ModerationService {
  /**
   * Evaluates text using OpenAI's omni-moderation-latest model.
   * If flagged, maps to a SeverityTier, logs a ModerationEvent, 
   * applies penalties, and handles suspensions for CRITICAL/SEVERE hits.
   */
  static async checkTextToxicity(conversationId: string, userId: string, text: string): Promise<{
    flagged: boolean;
    severityTier?: SeverityTier;
  }> {
    if (!openai) {
      console.warn("ModerationService: OPENAI_API_KEY not set. Skipping real moderation.");
      return { flagged: false };
    }

    try {
      const response = await openai.moderations.create({
        model: 'omni-moderation-latest',
        input: text,
      });

      const result = response.results[0];
      if (!result || !result.flagged) {
        return { flagged: false };
      }

      // Find the most confident flagged category to determine severity
      let maxCategory = 'other';
      let maxScore = 0;

      for (const [category, flagged] of Object.entries(result.categories)) {
        if (flagged) {
          const score = (result.category_scores as any)[category] || 0;
          if (score > maxScore) {
            maxScore = score;
            maxCategory = category;
          }
        }
      }

      const severityTier = getSeverityTier(maxCategory);
      
      // Log Event
      await ModerationEvent.create({
        conversationId,
        userId,
        signalType: `text_${maxCategory}`,
        confidence: maxScore,
        severityTier
      });

      // Handle enforcement
      if (severityTier === SeverityTier.CRITICAL) {
        await User.findByIdAndUpdate(userId, {
          isSuspended: true,
          suspendedAt: new Date(),
          suspensionReason: `Automated moderation flag: ${maxCategory} (CRITICAL)`
        });
        
        await AdminNotificationService.notifySeverityAction(
          userId, 
          'SUSPENDED', 
          `Auto-moderation caught critical text (${maxCategory})`, 
          severityTier
        );
      } else if (severityTier === SeverityTier.SEVERE) {
        await User.findByIdAndUpdate(userId, {
          matchingPaused: true,
          suspensionReason: `Automated moderation flag: ${maxCategory} (SEVERE)`
        });
        
        await AdminNotificationService.notifySeverityAction(
          userId, 
          'QUEUED', 
          `Auto-moderation caught severe text (${maxCategory})`, 
          severityTier
        );
      } else {
        // Minor/Moderate: just increment moderation penalty
        const penaltyIncrement = severityTier === SeverityTier.MODERATE ? 10 : 2;
        await TrustSignal.findOneAndUpdate(
          { userId },
          { $inc: { moderationPenalty: penaltyIncrement } },
          { upsert: true }
        );
      }

      return { flagged: true, severityTier };
    } catch (err) {
      console.error("Error during OpenAI moderation check:", err);
      // Fail open (don't disrupt user if moderation API is down, just log)
      return { flagged: false };
    }
  }
}

import mongoose from 'mongoose';
import { UserRepository } from '../users/userRepository.js';
import { MatchFeedbackRepository } from './matchFeedbackRepository.js';
import { TrustSignalRepository } from './trustSignalRepository.js';

export const MIN_RATINGS = 5;
export const NEUTRAL_DEFAULT = 50;
export const MATURITY_THRESHOLD = 20;

export const calculateTrustScore = (successes: number, n: number): number => {
  if (n < MIN_RATINGS) {
    return NEUTRAL_DEFAULT;
  }
  const p = successes / n;
  const z = 1.96;
  const z2 = z * z;
  const wilson_lb = (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n);
  return wilson_lb * 100;
};

export const calculateBaseTrust = (isVerified: boolean, createdAt: Date): number => {
  let score = 40;
  if (isVerified) score += 15;
  const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > 30) score += 5;
  return score;
};

export const updateTrustScoreForUser = async (userId: string | mongoose.Types.ObjectId): Promise<void> => {
  try {
    const objectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const user = await UserRepository.findById(objectId.toString());
    if (!user) return;
    
    const baseTrust = calculateBaseTrust(user.isVerified, user.createdAt);

    const totalConversations = await MatchFeedbackRepository.countUserConversations(objectId);
    const trustMaturity = Math.min(1.0, totalConversations / MATURITY_THRESHOLD);

    const { likesCount, dislikesCount } = await MatchFeedbackRepository.aggregateUserFeedbackStats(objectId);
    const wilsonScore = calculateTrustScore(likesCount, likesCount + dislikesCount);

    const existingSignal = await TrustSignalRepository.findByUserId(objectId);
    const repeatConnectionScore = existingSignal ? existingSignal.repeatConnectionScore : 0;
    const decayedReportScore = existingSignal ? existingSignal.decayedReportScore : 0;
    const durationSignalDecayed = existingSignal ? existingSignal.durationSignalDecayed : 0;
    const moderationPenalty = existingSignal ? existingSignal.moderationPenalty : 0;

    // Normalization of duration signal (e.g. max +20 boost)
    const normalizedDurationBonus = Math.min(20, durationSignalDecayed / 3600 * 5); // Example scaling

    const rawEarnedTrust = wilsonScore + repeatConnectionScore + normalizedDurationBonus - decayedReportScore - moderationPenalty;
    const earnedTrust = Math.max(0, Math.min(100, rawEarnedTrust));
    const effectiveTrust = baseTrust * (1 - trustMaturity) + earnedTrust * trustMaturity;

    await TrustSignalRepository.upsertTrustSignal(objectId, {
      likesCount,
      dislikesCount,
      earnedTrust,
      baseTrust,
      trustMaturity,
      effectiveTrust,
      repeatConnectionScore,
      decayedReportScore,
      durationSignalDecayed,
      moderationPenalty,
      lastComputed: new Date()
    });
  } catch (error) {
    console.error('Error updating trust score for user:', error);
  }
};

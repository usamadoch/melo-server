import { ReportsRepository } from "./reportsRepository.js";
import { getSeverityTier, SeverityTier } from "../config/severityMap.js";
import { User } from "../models/User.js";
import { TrustSignal } from "../models/TrustSignal.js";
import { ReporterCredibility } from "../models/ReporterCredibility.js";
import { AdminNotificationService } from "../admin/adminNotificationService.js";

export interface CreateReportPayload {
  reportedUserId: string;
  reason: 'nudity' | 'harassment' | 'spam' | 'hate_speech' | 'fake_camera' | 'other';
  text?: string;
  matchType: 'current' | 'previous';
}

const MIN_REPORTS_FOR_CREDIBILITY = 5;
const NEUTRAL_CREDIBILITY_SCORE = 50;

export class ReportsService {
  static async createReport(reporterId: string, payload: CreateReportPayload) {
    const severityTier = getSeverityTier(payload.reason);

    const reportData: any = {
      reporterId: reporterId as any,
      reportedUserId: payload.reportedUserId as any,
      reason: payload.reason,
      matchType: payload.matchType,
      severityTier,
      status: 'PENDING'
    };
    if (payload.text) reportData.text = payload.text;

    const report = await ReportsRepository.createReport(reportData);

    // Enforcement Logic based on Severity
    if (severityTier === SeverityTier.CRITICAL) {
      // Immediate action
      await User.findByIdAndUpdate(payload.reportedUserId, {
        isSuspended: true,
        suspendedAt: new Date(),
        suspensionReason: `Reported for ${payload.reason} (CRITICAL)`
      });
      
      await AdminNotificationService.notifySeverityAction(
        payload.reportedUserId,
        'SUSPENDED',
        `User reported for ${payload.reason}`,
        severityTier
      );
    } else if (severityTier === SeverityTier.SEVERE) {
      await User.findByIdAndUpdate(payload.reportedUserId, {
        matchingPaused: true,
        suspensionReason: `Reported for ${payload.reason} (SEVERE)`
      });
      
      await AdminNotificationService.notifySeverityAction(
        payload.reportedUserId,
        'QUEUED',
        `User reported for ${payload.reason}`,
        severityTier
      );
    } else {
      // For MINOR/MODERATE, compute penalty based on reporter credibility
      let credibility = await ReporterCredibility.findOne({ userId: reporterId });
      
      let effectiveCredibility = NEUTRAL_CREDIBILITY_SCORE;
      if (credibility) {
        const totalReports = credibility.upheldReports + credibility.dismissedReports;
        if (totalReports >= MIN_REPORTS_FOR_CREDIBILITY) {
          effectiveCredibility = credibility.credibilityScore;
        }
      }

      // Penalty scale: e.g. base penalty is 10 for MODERATE, 5 for MINOR.
      // Scaled by credibility (0 to 100). If credibility is 50, you get 50% penalty.
      const basePenalty = severityTier === SeverityTier.MODERATE ? 10 : 5;
      const appliedPenalty = basePenalty * (effectiveCredibility / 100);

      await TrustSignal.findOneAndUpdate(
        { userId: payload.reportedUserId },
        { $inc: { decayedReportScore: appliedPenalty } },
        { upsert: true }
      );
    }

    return report;
  }
}

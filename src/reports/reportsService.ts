// import { ReportsRepository } from './reportsRepository.js';

import { ReportsRepository } from "./reportsRepository.js";

export interface CreateReportPayload {
  reportedUserId: string;
  reason: 'nudity' | 'harassment' | 'spam' | 'hate_speech' | 'fake_camera' | 'other';
  text?: string;
  matchType: 'current' | 'previous';
}

export class ReportsService {
  static async createReport(reporterId: string, payload: CreateReportPayload) {
    const reportData: any = {
      reporterId: reporterId as any,
      reportedUserId: payload.reportedUserId as any,
      reason: payload.reason,
      matchType: payload.matchType,
    };
    if (payload.text) reportData.text = payload.text;

    const report = await ReportsRepository.createReport(reportData);

    // Future extension: Update trust score or trigger moderation alert here

    return report;
  }
}

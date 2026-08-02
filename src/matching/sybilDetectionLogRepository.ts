import { SybilDetectionLog } from '../models/SybilDetectionLog.js';

interface CreateLogInput {
  clusterNodes: string[];
  fingerprintMatch: string;
  actionTaken: boolean;
  reason: string;
}

export class SybilDetectionLogRepository {
  static async createLog(data: CreateLogInput): Promise<void> {
    await SybilDetectionLog.create(data);
  }
}

import { Report, type IReport } from '../models/Report.js';

export class ReportsRepository {
  static async createReport(reportData: Partial<IReport>): Promise<IReport> {
    const report = new Report(reportData);
    return await report.save();
  }
}

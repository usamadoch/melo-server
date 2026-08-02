import mongoose, { Schema, Document } from 'mongoose';

export interface IReporterCredibility extends Document {
  userId: mongoose.Types.ObjectId;
  upheldReports: number;
  dismissedReports: number;
  credibilityScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReporterCredibilitySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    upheldReports: { type: Number, default: 0 },
    dismissedReports: { type: Number, default: 0 },
    credibilityScore: { type: Number, default: 50 }, // neutral baseline
  },
  { timestamps: true }
);

export const ReporterCredibility = mongoose.model<IReporterCredibility>('ReporterCredibility', ReporterCredibilitySchema);

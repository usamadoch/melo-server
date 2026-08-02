import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reportedUserId: mongoose.Types.ObjectId;
  reason: 'nudity' | 'harassment' | 'spam' | 'hate_speech' | 'fake_camera' | 'other';
  text?: string;
  matchType: 'current' | 'previous';
  severityTier: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  status: 'PENDING' | 'RESOLVED';
  outcome?: 'UPHELD' | 'DISMISSED' | null;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { 
      type: String, 
      enum: ['nudity', 'harassment', 'spam', 'hate_speech', 'fake_camera', 'other'],
      required: true 
    },
    text: { type: String },
    matchType: { type: String, enum: ['current', 'previous'], required: true },
    severityTier: { type: String, enum: ['MINOR', 'MODERATE', 'SEVERE', 'CRITICAL'], default: 'MINOR' },
    status: { type: String, enum: ['PENDING', 'RESOLVED'], default: 'PENDING' },
    outcome: { type: String, enum: ['UPHELD', 'DISMISSED', null], default: null },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);

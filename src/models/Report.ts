import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reportedUserId: mongoose.Types.ObjectId;
  reason: 'nudity' | 'harassment' | 'spam' | 'hate_speech' | 'fake_camera' | 'other';
  text?: string;
  matchType: 'current' | 'previous';
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
    matchType: { type: String, enum: ['current', 'previous'], required: true }
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);

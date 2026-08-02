import mongoose, { Schema, Document } from 'mongoose';

export interface ISybilDetectionLog extends Document {
  detectedAt: Date;
  clusterNodes: mongoose.Types.ObjectId[];
  fingerprintMatch: string;
  actionTaken: boolean;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

const SybilDetectionLogSchema: Schema = new Schema(
  {
    detectedAt: { type: Date, default: Date.now },
    clusterNodes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    fingerprintMatch: { type: String, required: true },
    actionTaken: { type: Boolean, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

export const SybilDetectionLog = mongoose.model<ISybilDetectionLog>('SybilDetectionLog', SybilDetectionLogSchema);

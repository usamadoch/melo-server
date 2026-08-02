import mongoose, { Schema, Document } from 'mongoose';

export interface ITrustSignal extends Document {
  userId: mongoose.Types.ObjectId;
  likesCount: number;
  dislikesCount: number;
  earnedTrust: number; // was trustScore
  baseTrust: number;
  trustMaturity: number;
  effectiveTrust: number;
  repeatConnectionScore: number;
  decayedReportScore: number;
  durationSignalDecayed: number;
  moderationPenalty: number;
  lastComputed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TrustSignalSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },
    earnedTrust: { type: Number, default: 50 },
    baseTrust: { type: Number, default: 40 },
    trustMaturity: { type: Number, default: 0 },
    effectiveTrust: { type: Number, default: 40 },
    repeatConnectionScore: { type: Number, default: 0 },
    decayedReportScore: { type: Number, default: 0 },
    durationSignalDecayed: { type: Number, default: 0 },
    moderationPenalty: { type: Number, default: 0 },
    lastComputed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const TrustSignal = mongoose.model<ITrustSignal>('TrustSignal', TrustSignalSchema);

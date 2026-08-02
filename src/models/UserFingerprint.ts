import mongoose, { Schema, Document } from 'mongoose';

export interface IUserFingerprint extends Document {
  userId: mongoose.Types.ObjectId;
  ipHash: string;
  deviceHash: string;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserFingerprintSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    ipHash: { type: String, required: true },
    deviceHash: { type: String, required: true },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes to quickly find shared fingerprints
UserFingerprintSchema.index({ ipHash: 1 });
UserFingerprintSchema.index({ deviceHash: 1 });

export const UserFingerprint = mongoose.model<IUserFingerprint>('UserFingerprint', UserFingerprintSchema);

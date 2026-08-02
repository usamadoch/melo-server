import mongoose, { Schema, Document } from 'mongoose';

export interface IModerationEvent extends Document {
  conversationId: string;
  userId: mongoose.Types.ObjectId;
  signalType: string;
  confidence: number;
  severityTier: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ModerationEventSchema: Schema = new Schema(
  {
    conversationId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    signalType: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    severityTier: { type: String, enum: ['MINOR', 'MODERATE', 'SEVERE', 'CRITICAL'], required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const ModerationEvent = mongoose.model<IModerationEvent>('ModerationEvent', ModerationEventSchema);

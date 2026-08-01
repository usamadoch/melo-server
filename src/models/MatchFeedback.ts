import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchFeedback extends Document {
  matchId: string;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  source: 'RANDOM' | 'EXPLORE';
  currentState: 'LIKE' | 'DISLIKE' | 'NONE';
  reasonCode: 'NUDITY_INAPPROPRIATE' | 'HARASSMENT' | 'DIFFERENT_INTERESTS' | 'CONNECTION_ISSUE' | null;
  finalized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MatchFeedbackSchema: Schema = new Schema(
  {
    matchId: { type: String, required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['RANDOM', 'EXPLORE'], required: true },
    currentState: { type: String, enum: ['LIKE', 'DISLIKE', 'NONE'], required: true, default: 'NONE' },
    reasonCode: {
      type: String,
      enum: ['NUDITY_INAPPROPRIATE', 'HARASSMENT', 'DIFFERENT_INTERESTS', 'CONNECTION_ISSUE', null],
      default: null
    },
    finalized: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Compound index to ensure one active row per user per match, and optimize upserts
MatchFeedbackSchema.index({ matchId: 1, fromUserId: 1 }, { unique: true });

export const MatchFeedback = mongoose.model<IMatchFeedback>('MatchFeedback', MatchFeedbackSchema);

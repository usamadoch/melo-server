import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationActivity extends Document {
  conversationId: string;
  userId: mongoose.Types.ObjectId;
  durationSeconds: number;
  messageCount: number;
  audioActiveRatio: number;
  videoMotionRatio: number;
  turnTakingScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationActivitySchema: Schema = new Schema(
  {
    conversationId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    durationSeconds: { type: Number, required: true },
    messageCount: { type: Number, default: 0 },
    audioActiveRatio: { type: Number, default: 0 },
    videoMotionRatio: { type: Number, default: 0 },
    turnTakingScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const ConversationActivity = mongoose.model<IConversationActivity>('ConversationActivity', ConversationActivitySchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  matchId: string;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  text: string;
  status: 'DELIVERED' | 'BLOCKED';
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    matchId: { type: String, required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    status: { type: String, enum: ['DELIVERED', 'BLOCKED'], required: true, default: 'DELIVERED' }
  },
  { timestamps: true }
);

// Optimize for fetching a match's chat history
ChatMessageSchema.index({ matchId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

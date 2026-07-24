import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProfile extends Document {
  userId: Types.ObjectId;
  bio?: string;
  conversationTitle?: string;
  interests: string[];
  showOnExplore: boolean;
  allowRandomMatching: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, maxlength: 500 },
    conversationTitle: { type: String, maxlength: 100 },
    interests: [{ type: String }],
    showOnExplore: { type: Boolean, default: true },
    allowRandomMatching: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);

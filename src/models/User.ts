import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
  isVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    avatar: { type: String },
    isVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);

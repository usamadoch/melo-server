import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProfile extends Document {
  userId: Types.ObjectId;

  categories: string[];
  subcategories: string[];
  freeTextInterest?: string;
  interestVector?: number[];
  showOnExplore: boolean;
  exploreThumbnail?: string;
  allowRandomMatching: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    categories: [{ type: String }],
    subcategories: [{ type: String }],
    freeTextInterest: { type: String, maxlength: 200 },
    interestVector: [{ type: Number }],
    showOnExplore: { type: Boolean, default: true },
    exploreThumbnail: { type: String },
    allowRandomMatching: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);

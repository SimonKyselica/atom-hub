import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  timezone: string;
  weekStart: number;
  xp: number;
  coins: number;
  achievements: { key: string; unlockedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    passwordHash: { type: String, required: true },
    timezone: { type: String, default: "UTC" },
    weekStart: { type: Number, default: 0, min: 0, max: 1 },
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    achievements: [{ _id: false, key: String, unlockedAt: Date }],
  },
  { timestamps: true },
);

export const User: Model<IUser> = models.User || model<IUser>("User", UserSchema);

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
  /** Streak freezes in stock (see FREEZE in lib/game). */
  freezes: number;
  /** Last day already checked for missed habits / freeze use. */
  settledThrough: string | null;
  todoDigest: { enabled: boolean; time: string };
  publicSlug: string | null;
  publicEnabled: boolean;
  publicShowHabits: boolean;
  /** Today's daily quests, picked once per day. */
  quests: { date: string | null; items: { key: string; goal: number }[] };
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
    freezes: { type: Number, default: 0, min: 0 },
    settledThrough: { type: String, default: null },
    todoDigest: {
      enabled: { type: Boolean, default: false },
      time: { type: String, default: "08:00" },
    },
    publicSlug: { type: String, default: null },
    publicEnabled: { type: Boolean, default: false },
    publicShowHabits: { type: Boolean, default: false },
    quests: {
      date: { type: String, default: null },
      items: [{ _id: false, key: String, goal: Number }],
    },
  },
  { timestamps: true },
);

// Partial (not sparse): sparse indexes still include explicit nulls, which would collide.
UserSchema.index({ publicSlug: 1 }, { unique: true, partialFilterExpression: { publicSlug: { $type: "string" } } });

export const User: Model<IUser> = models.User || model<IUser>("User", UserSchema);

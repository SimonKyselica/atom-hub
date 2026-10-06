import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IReward {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  emoji: string;
  cost: number;
  redeemedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const RewardSchema = new Schema<IReward>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    emoji: { type: String, default: "🎁", maxlength: 16 },
    cost: { type: Number, required: true, min: 1 },
    redeemedCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Reward: Model<IReward> = models.Reward || model<IReward>("Reward", RewardSchema);

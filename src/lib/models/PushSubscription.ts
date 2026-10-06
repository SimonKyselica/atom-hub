import { Schema, model, models, type Model, type Types } from "mongoose";

/** One browser/device that agreed to receive push notifications. */
export interface IPushSubscription {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PushSubscription: Model<IPushSubscription> =
  models.PushSubscription || model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);

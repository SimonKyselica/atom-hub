import { Schema, model, models, type Model } from "mongoose";

/** Remembers which reminders went out, so a cron running every few minutes sends each one once. */
export interface INotificationLog {
  key: string;
  createdAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 48 },
});

export const NotificationLog: Model<INotificationLog> =
  models.NotificationLog || model<INotificationLog>("NotificationLog", NotificationLogSchema);

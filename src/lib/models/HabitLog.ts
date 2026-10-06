import { Schema, model, models, type Model, type Types } from "mongoose";

/** One document per habit per day. `value` is 1/0 for check habits, a count otherwise. */
export interface IHabitLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  habitId: Types.ObjectId;
  date: string;
  value: number;
  done: boolean;
}

const HabitLogSchema = new Schema<IHabitLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true },
    date: { type: String, required: true },
    value: { type: Number, default: 0, min: 0 },
    done: { type: Boolean, default: false },
  },
  { timestamps: true },
);

HabitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });
HabitLogSchema.index({ userId: 1, date: 1 });

export const HabitLog: Model<IHabitLog> = models.HabitLog || model<IHabitLog>("HabitLog", HabitLogSchema);

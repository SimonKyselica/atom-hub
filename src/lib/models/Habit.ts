import { Schema, model, models, type Model, type Types } from "mongoose";
import { DIFFICULTY_KEYS, PALETTES, type Difficulty, type Palette } from "@/lib/game";

export interface IHabit {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  emoji: string;
  type: "check" | "count";
  target: number;
  unit: string;
  days: number[];
  difficulty: Difficulty;
  palette: Palette;
  startDate: string;
  archived: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const HabitSchema = new Schema<IHabit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    emoji: { type: String, default: "✅", maxlength: 16 },
    type: { type: String, enum: ["check", "count"], default: "check" },
    target: { type: Number, default: 1, min: 1 },
    unit: { type: String, default: "", maxlength: 24 },
    days: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    difficulty: { type: String, enum: DIFFICULTY_KEYS, default: "medium" },
    palette: { type: String, enum: PALETTES, default: "green" },
    startDate: { type: String, required: true },
    archived: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Habit: Model<IHabit> = models.Habit || model<IHabit>("Habit", HabitSchema);

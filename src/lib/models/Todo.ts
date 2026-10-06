import { Schema, model, models, type Model, type Types } from "mongoose";
import { DIFFICULTY_KEYS, type Difficulty } from "@/lib/game";

export interface ITodo {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  notes: string;
  dueDate: string | null;
  difficulty: Difficulty;
  done: boolean;
  doneDate: string | null;
  doneAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    notes: { type: String, default: "", maxlength: 2000 },
    dueDate: { type: String, default: null },
    difficulty: { type: String, enum: DIFFICULTY_KEYS, default: "easy" },
    done: { type: Boolean, default: false },
    doneDate: { type: String, default: null },
    doneAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Todo: Model<ITodo> = models.Todo || model<ITodo>("Todo", TodoSchema);

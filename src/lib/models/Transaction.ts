import { Schema, model, models, type Model, type Types } from "mongoose";

export const TRANSACTION_KINDS = [
  "habit",
  "todo",
  "perfect_day",
  "achievement",
  "reward",
  "freeze_purchase",
  "freeze_used",
  "quest",
  "mastery",
] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

/**
 * The XP/coin ledger. Habit and todo entries are also the "contributions" that
 * fill the overall graph, so deleting a todo or habit never erases your history.
 * `dedupeKey` makes every award idempotent (double taps, retries, races).
 */
export interface ITransaction {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  kind: TransactionKind;
  refId: string;
  date: string;
  label: string;
  icon: string;
  xp: number;
  coins: number;
  dedupeKey?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: TRANSACTION_KINDS, required: true },
    refId: { type: String, default: "" },
    date: { type: String, required: true },
    label: { type: String, default: "" },
    icon: { type: String, default: "" },
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    dedupeKey: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

TransactionSchema.index({ userId: 1, kind: 1, date: 1 });
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $exists: true } } });

export const Transaction: Model<ITransaction> =
  models.Transaction || model<ITransaction>("Transaction", TransactionSchema);

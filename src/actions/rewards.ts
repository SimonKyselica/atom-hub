"use server";

import { Types } from "mongoose";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser, userToday } from "@/lib/dal";
import { afterRedeem, finish, type ActionError, type GameResult } from "@/lib/engine";
import { FREEZE } from "@/lib/game";
import { Reward, Transaction, User, type IReward } from "@/lib/models";
import type { RewardInput } from "@/lib/types";

const rewardSchema = z.object({
  name: z.string().trim().min(1, "Name your reward").max(80),
  emoji: z.string().trim().min(1).max(16).catch("🎁"),
  cost: z.coerce.number().int().min(1, "Cost must be at least 1 coin").max(1_000_000),
});

export async function createReward(input: RewardInput): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = rewardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await Reward.create({ ...parsed.data, userId: user._id });
  refresh();
  return { ok: true };
}

export async function updateReward(id: string, input: RewardInput): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = rewardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Reward not found" };
  await Reward.updateOne({ _id: id, userId: user._id }, { $set: parsed.data });
  refresh();
  return { ok: true };
}

export async function deleteReward(id: string): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  if (Types.ObjectId.isValid(id)) await Reward.deleteOne({ _id: id, userId: user._id });
  refresh();
  return { ok: true };
}

export async function redeemReward(id: string): Promise<GameResult | ActionError> {
  const user = await requireUser();
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Reward not found" };
  const reward = await Reward.findOne({ _id: id, userId: user._id }).lean<IReward>();
  if (!reward) return { ok: false, error: "Reward not found" };

  // Atomic: only deducts if the balance covers it.
  const paid = await User.updateOne(
    { _id: user._id, coins: { $gte: reward.cost } },
    { $inc: { coins: -reward.cost } },
  );
  if (!paid.modifiedCount) return { ok: false, error: "Not enough coins yet — keep going!" };

  const today = userToday(user);
  await Promise.all([
    Transaction.create({
      userId: user._id,
      kind: "reward",
      refId: String(reward._id),
      date: today,
      label: reward.name,
      icon: reward.emoji,
      xp: 0,
      coins: -reward.cost,
    }),
    Reward.updateOne({ _id: reward._id }, { $inc: { redeemedCount: 1 } }),
  ]);
  const result = await afterRedeem(user, reward.cost, today);
  refresh();
  return result;
}

/** Streak freeze: bought like a reward, kept in stock, spent automatically on a missed day. */
export async function buyFreeze(): Promise<GameResult | ActionError> {
  const user = await requireUser();
  // `$not: $gte` also matches accounts created before freezes existed (no field = 0 in stock).
  const paid = await User.updateOne(
    { _id: user._id, coins: { $gte: FREEZE.cost }, freezes: { $not: { $gte: FREEZE.max } } },
    { $inc: { coins: -FREEZE.cost, freezes: 1 } },
  );
  if (!paid.modifiedCount) {
    const now = await User.findById(user._id, { coins: 1, freezes: 1 }).lean();
    if ((now?.freezes ?? 0) >= FREEZE.max) return { ok: false, error: `You can hold up to ${FREEZE.max} freezes.` };
    if ((now?.coins ?? 0) < FREEZE.cost) return { ok: false, error: "Not enough coins yet — keep going!" };
    return { ok: false, error: "Couldn't buy a freeze right now. Please try again." };
  }
  await Transaction.create({
    userId: user._id,
    kind: "freeze_purchase",
    refId: "",
    date: userToday(user),
    label: "Streak freeze",
    icon: "❄️",
    xp: 0,
    coins: -FREEZE.cost,
  });
  refresh();
  return finish(user._id, user.xp, { xp: 0, coins: -FREEZE.cost }, []);
}

"use server";

import { refresh } from "next/cache";
import { requireUser, userToday } from "@/lib/dal";
import { checkAchievements, finish, grant, type ActionError, type GameResult } from "@/lib/engine";
import { questReady } from "@/lib/quests";

export async function claimQuest(key: string): Promise<GameResult | ActionError> {
  const user = await requireUser();
  const today = userToday(user);
  const quest = await questReady(user, today, key);
  if (!quest) return { ok: false, error: "That quest isn't complete yet." };

  const delta = await grant(user._id, {
    kind: "quest",
    refId: quest.key,
    date: today,
    label: quest.title,
    icon: quest.icon,
    xp: 0,
    coins: quest.reward,
    dedupeKey: `quest:${user._id}:${today}:${quest.key}`,
  });
  const achievements = await checkAchievements(user._id, { date: today });
  refresh();
  return finish(user._id, user.xp, delta, achievements);
}

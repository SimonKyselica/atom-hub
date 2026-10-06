"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/dal";
import { isValidTimeZone } from "@/lib/dates";
import type { ActionError } from "@/lib/engine";
import { User } from "@/lib/models";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  weekStart: z.union([z.literal(0), z.literal(1)]),
});

export async function updateProfile(input: { name: string; weekStart: number }): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await User.updateOne({ _id: user._id }, { $set: parsed.data });
  refresh();
  return { ok: true };
}

/** Keeps "today" correct when you travel: the device's timezone wins. */
export async function syncTimezone(timezone: string) {
  const user = await requireUser();
  if (!isValidTimeZone(timezone) || user.timezone === timezone) return;
  await User.updateOne({ _id: user._id }, { $set: { timezone } });
  refresh();
}

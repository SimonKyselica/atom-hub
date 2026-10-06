"use server";

import { randomBytes } from "node:crypto";
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

function newSlug() {
  return randomBytes(6).toString("base64url"); // 8 URL-safe chars, unguessable
}

/** Public, read-only profile at /u/<slug>. Off by default; habit names stay private unless opted in. */
export async function setPublicProfile(input: { enabled: boolean; showHabits: boolean }): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const enabled = Boolean(input.enabled);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        publicEnabled: enabled,
        publicShowHabits: Boolean(input.showHabits),
        ...(enabled && !user.publicSlug && { publicSlug: newSlug() }),
      },
    },
  );
  refresh();
  return { ok: true };
}

/** Invalidates the old link. */
export async function regeneratePublicLink(): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  await User.updateOne({ _id: user._id }, { $set: { publicSlug: newSlug() } });
  refresh();
  return { ok: true };
}

"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/dal";
import type { ActionError } from "@/lib/engine";
import { PushSubscription, User } from "@/lib/models";
import { pushConfigured, sendToUser } from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

export async function savePushSubscription(input: unknown, userAgent: string): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid push subscription" };
  // An endpoint belongs to one browser; re-subscribing (or a different account on it) takes it over.
  await PushSubscription.updateOne(
    { endpoint: parsed.data.endpoint },
    { $set: { userId: user._id, keys: parsed.data.keys, userAgent: userAgent.slice(0, 300) } },
    { upsert: true },
  );
  refresh();
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: true }> {
  const user = await requireUser();
  await PushSubscription.deleteOne({ userId: user._id, endpoint });
  refresh();
  return { ok: true };
}

export async function sendTestPush(): Promise<{ ok: true; sent: number } | ActionError> {
  const user = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "Push isn't configured on the server (VAPID keys missing)." };
  const sent = await sendToUser(user._id, {
    title: "🌱 Atom Hub",
    body: "Notifications are working. Your streaks thank you.",
    url: "/profile",
    tag: "test",
  });
  if (!sent) return { ok: false, error: "No devices reached. Try disabling and re-enabling notifications." };
  return { ok: true, sent };
}

const digestSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time"),
});

export async function updateTodoDigest(input: { enabled: boolean; time: string }): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  const parsed = digestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await User.updateOne({ _id: user._id }, { $set: { todoDigest: parsed.data } });
  refresh();
  return { ok: true };
}

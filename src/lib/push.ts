import "server-only";
import webpush from "web-push";
import type { Types } from "mongoose";
import { PushSubscription, type IPushSubscription } from "./models";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
  data?: Record<string, unknown>;
};

let configured = false;

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  if (configured) return true;
  if (!pushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
  return true;
}

/** Sends to every device the user enabled. Dead subscriptions (uninstalled app, revoked permission) are removed. */
export async function sendToUser(userId: Types.ObjectId, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;
  const subs = await PushSubscription.find({ userId }).lean<IPushSubscription[]>();
  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), {
          TTL: 60 * 60 * 4,
          urgency: "normal",
        });
        return 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await PushSubscription.deleteOne({ _id: s._id });
        else console.error("Push failed", status, (err as { body?: string }).body);
        return 0;
      }
    }),
  );
  return results.reduce<number>((a, b) => a + b, 0);
}

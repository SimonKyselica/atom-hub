import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { runReminders } from "@/lib/notify";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Sends due habit reminders and todo digests. Call it every 5–15 minutes with
 * `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this header automatically).
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const stats = await runReminders();
  return Response.json({ ok: true, ...stats });
}

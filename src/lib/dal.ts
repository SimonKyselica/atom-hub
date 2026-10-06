import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "./db";
import { User, type IUser } from "./models";
import { SESSION_COOKIE, verifySession } from "./session-token";
import { dateKeyInZone } from "./dates";
import { settleMissedDays } from "./freeze";

export const getSessionUserId = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return (await verifySession(token))?.userId ?? null;
});

export const getCurrentUser = cache(async (): Promise<IUser | null> => {
  const id = await getSessionUserId();
  if (!id) return null;
  await connectDB();
  const user = await User.findById(id).lean<IUser>();
  // First visit of the day: spend streak freezes on missed days, then reload.
  if (user && (await settleMissedDays(user, userToday(user)))) return User.findById(id).lean<IUser>();
  return user;
});

/** Use in every page and Server Action that needs a signed-in user. */
export async function requireUser(): Promise<IUser> {
  const user = await getCurrentUser();
  // A valid cookie for a user that no longer exists: clear it via the logout route.
  if (!user) redirect((await getSessionUserId()) ? "/logout" : "/login");
  return user;
}

export function userToday(user: Pick<IUser, "timezone">) {
  return dateKeyInZone(new Date(), user.timezone || "UTC");
}

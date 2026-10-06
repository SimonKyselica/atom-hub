import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "./session-token";

export async function createSession(userId: string) {
  const token = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

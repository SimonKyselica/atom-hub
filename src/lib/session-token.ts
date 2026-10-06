// Pure JWT helpers, shared by proxy.ts and the server-side session code.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "atom_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days, refreshed while you keep using the app

export type SessionPayload = { userId: string; iat?: number; exp?: number };

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Generate one with: openssl rand -base64 32");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, key(), { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? payload : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

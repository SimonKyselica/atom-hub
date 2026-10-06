"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { isValidTimeZone } from "@/lib/dates";
import { Reward, User } from "@/lib/models";
import { createSession, deleteSession } from "@/lib/session";
import { isSignupOpen } from "@/lib/signup";

export type AuthState = { error?: string; email?: string } | undefined;

const DEFAULT_REWARDS = [
  { name: "Fancy coffee", emoji: "☕", cost: 30 },
  { name: "An episode of a show", emoji: "📺", cost: 50 },
  { name: "Hour of gaming", emoji: "🎮", cost: 80 },
  { name: "Movie night", emoji: "🍿", cost: 150 },
  { name: "Buy something nice", emoji: "🛍️", cost: 400 },
];

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email"),
  password: z.string().min(1, "Enter your password"),
});

function clientPrefs(formData: FormData) {
  const tz = formData.get("timezone");
  const weekStart = Number(formData.get("weekStart"));
  return {
    timezone: isValidTimeZone(tz) ? tz : "UTC",
    weekStart: weekStart === 1 ? 1 : 0,
  };
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };
  if (!(await isSignupOpen())) return { error: "Sign-up is closed on this server.", email };

  const { name, password } = parsed.data;
  if (await User.exists({ email: parsed.data.email })) {
    return { error: "An account with this email already exists.", email };
  }

  const user = await User.create({
    name,
    email: parsed.data.email,
    passwordHash: await bcrypt.hash(password, 12),
    ...clientPrefs(formData),
  });
  await Reward.insertMany(DEFAULT_REWARDS.map((r) => ({ ...r, userId: user._id })));
  await createSession(String(user._id));
  redirect("/");
}

let dummyHash: string | null = null;

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  await connectDB();
  const user = await User.findOne({ email: parsed.data.email }, { passwordHash: 1 }).lean();
  // Always run bcrypt so response time doesn't reveal whether the email exists.
  dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
  const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) return { error: "Incorrect email or password.", email };

  const { timezone } = clientPrefs(formData);
  await User.updateOne({ _id: user._id }, { $set: { timezone } });
  await createSession(String(user._id));
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

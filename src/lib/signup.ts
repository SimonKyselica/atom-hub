import "server-only";
import { connection } from "next/server";
import { connectDB } from "./db";
import { User } from "./models";

/** Sign-up is open until the first account exists, then only if ALLOW_SIGNUP=true. */
export async function isSignupOpen() {
  await connection(); // depends on the live database — never prerender
  if (process.env.ALLOW_SIGNUP === "true") return true;
  await connectDB();
  return !(await User.exists({}));
}

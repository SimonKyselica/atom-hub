import type { Metadata } from "next";
import { isSignupOpen } from "@/lib/signup";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const signupOpen = await isSignupOpen();
  return (
    <>
      <h1 className="mb-4 text-center text-2xl font-light">Sign in to Atom Hub</h1>
      <AuthForm mode="login" signupOpen={signupOpen} />
    </>
  );
}

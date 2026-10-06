import type { Metadata } from "next";
import Link from "next/link";
import { isSignupOpen } from "@/lib/signup";
import { Box } from "@/components/ui";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (!(await isSignupOpen())) {
    return (
      <>
        <h1 className="mb-4 text-center text-2xl font-light">Sign-up is closed</h1>
        <Box className="p-4 text-center text-sm text-muted">
          This Atom Hub already has its owner.{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </Box>
      </>
    );
  }
  return (
    <>
      <h1 className="mb-1 text-center text-2xl font-light">Create your account</h1>
      <p className="mb-4 text-center text-sm text-muted">Start building streaks today.</p>
      <AuthForm mode="signup" signupOpen />
    </>
  );
}

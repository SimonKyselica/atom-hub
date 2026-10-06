"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { login, signup, type AuthState } from "@/actions/auth";
import { Box, Button, Field, Input } from "@/components/ui";

const noop = () => () => {};

function useDevicePrefs() {
  const timezone = useSyncExternalStore(noop, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => "");
  const weekStart = useSyncExternalStore(
    noop,
    () => {
      try {
        const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
          getWeekInfo?: () => { firstDay: number };
          weekInfo?: { firstDay: number };
        };
        const firstDay = locale.getWeekInfo?.().firstDay ?? locale.weekInfo?.firstDay ?? 7;
        return firstDay === 1 ? "1" : "0";
      } catch {
        return "0";
      }
    },
    () => "0",
  );
  return { timezone, weekStart };
}

export function AuthForm({ mode, signupOpen }: { mode: "login" | "signup"; signupOpen: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const { timezone, weekStart } = useDevicePrefs();
  const isSignup = mode === "signup";

  return (
    <>
      {state?.error && (
        <div role="alert" className="mb-4 rounded-md border border-danger/40 bg-danger-muted px-4 py-3 text-sm text-fg">
          {state.error}
        </div>
      )}
      <Box className="bg-subtle p-4">
        <form action={action} className="space-y-4">
          <input type="hidden" name="timezone" value={timezone} />
          <input type="hidden" name="weekStart" value={weekStart} />
          {isSignup && (
            <Field label="Name">
              <Input name="name" autoComplete="name" required maxLength={60} />
            </Field>
          )}
          <Field label="Email address">
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              autoCapitalize="none"
              defaultValue={state?.email}
            />
          </Field>
          <Field label="Password" hint={isSignup ? "At least 8 characters." : undefined}>
            <Input
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : 1}
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
            {pending ? (isSignup ? "Creating account…" : "Signing in…") : isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>
      </Box>
      {(isSignup || signupOpen) && (
        <Box className="mt-4 p-4 text-center text-sm">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to Atom Hub?{" "}
              <Link href="/signup" className="text-accent hover:underline">
                Create an account
              </Link>
            </>
          )}
        </Box>
      )}
    </>
  );
}

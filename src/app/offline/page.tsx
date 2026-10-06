import type { Metadata } from "next";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={64} height={64} className="rounded-2xl" />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-sm text-muted">
        Your streaks are safe. Reconnect to check in on today&apos;s habits — pages you visited recently still open
        offline.
      </p>
      <RetryButton />
    </main>
  );
}

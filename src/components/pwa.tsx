"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { syncTimezone } from "@/actions/user";
import { initPwa, isIos, isStandalone, promptInstall, useCanPromptInstall } from "@/lib/pwa";
import { Box, Button } from "./ui";

export function PwaInit() {
  useEffect(() => initPwa(), []);
  return null;
}

/** Keeps "today" right: syncs the device timezone and refreshes data when the app comes back to the foreground. */
export function ClientSync({ timezone }: { timezone: string }) {
  const router = useRouter();
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== timezone) syncTimezone(tz).catch(() => {});
  }, [timezone]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > 30_000) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  return null;
}

const noop = () => () => {};
function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Install card: native prompt on Android/desktop Chrome, instructions on iOS Safari. */
export function InstallCard({ dismissible = false }: { dismissible?: boolean }) {
  const isClient = useIsClient();
  const canPrompt = useCanPromptInstall();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined" || !dismissible) return false;
    try {
      return localStorage.getItem("install-dismissed") === "1";
    } catch {
      return false;
    }
  });

  if (!isClient || isStandalone() || dismissed) return null;
  const ios = isIos();
  if (!canPrompt && !ios) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("install-dismissed", "1");
    } catch {}
  };

  return (
    <Box className="flex items-start gap-3 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success-muted text-success">
        <Download size={18} />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Install Atom Hub</p>
        {ios ? (
          <p className="mt-0.5 text-muted">
            Tap <Share size={14} className="inline align-[-2px]" /> <b>Share</b>, then{" "}
            <SquarePlus size={14} className="inline align-[-2px]" /> <b>Add to Home Screen</b>.
          </p>
        ) : (
          <p className="mt-0.5 text-muted">Add it to your home screen for a full-screen, app-like experience.</p>
        )}
        {canPrompt && (
          <Button variant="primary" size="sm" className="mt-2" onClick={() => promptInstall()}>
            Install app
          </Button>
        )}
      </div>
      {dismissible && (
        <Button variant="invisible" size="sm" className="h-7 w-7 px-0" onClick={dismiss} aria-label="Dismiss">
          <X size={14} />
        </Button>
      )}
    </Box>
  );
}

"use client";

import { BellOff, BellRing, Copy, ExternalLink, RotateCcw, Send, Share } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { removePushSubscription, savePushSubscription, sendTestPush, updateTodoDigest } from "@/actions/push";
import { regeneratePublicLink, setPublicProfile } from "@/actions/user";
import { run } from "@/lib/feedback";
import { isIos, isStandalone } from "@/lib/pwa";
import { Box, Button, Input, Switch } from "./ui";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type PushState = "loading" | "unsupported" | "ios-install" | "no-sw" | "denied" | "off" | "on";

const PUSH_HINT: Partial<Record<PushState, string>> = {
  unsupported: "This browser doesn't support push notifications.",
  "ios-install":
    "On iPhone, notifications work in the installed app: tap Share → Add to Home Screen, open Atom Hub from your home screen, then enable them here.",
  "no-sw": "Notifications need the production build (npm run build && npm start) — the service worker isn't active in dev mode.",
  denied: "Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.",
};

export function NotificationSettings({
  vapidKey,
  digest,
  devices,
  reminderCount,
}: {
  vapidKey: string | null;
  digest: { enabled: boolean; time: string };
  devices: number;
  reminderCount: number;
}) {
  const [state, setState] = useState<PushState>("loading");
  const [pending, startTransition] = useTransition();
  const [digestForm, setDigestForm] = useState(digest);
  const digestDirty = digestForm.enabled !== digest.enabled || digestForm.time !== digest.time;

  useEffect(() => {
    (async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return setState("no-sw");
      if (Notification.permission === "denied") return setState("denied");
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  function enable() {
    if (!vapidKey) return toast.error("Push isn't configured on the server (NEXT_PUBLIC_VAPID_PUBLIC_KEY missing).");
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
        if (await run(savePushSubscription(sub.toJSON(), navigator.userAgent))) {
          setState("on");
          toast.success("Notifications enabled on this device", { icon: "🔔" });
        }
      } catch (err) {
        console.error(err);
        toast.error("Couldn't subscribe this device to notifications.");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await run(removePushSubscription(sub.endpoint));
        await sub.unsubscribe();
      }
      setState("off");
    });
  }

  function test() {
    startTransition(async () => {
      const res = await run(sendTestPush());
      if (res) toast.success(`Test sent to ${res.sent} device${res.sent === 1 ? "" : "s"}`);
    });
  }

  return (
    <Box className="divide-y divide-line">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Push notifications</p>
          <p className="mt-0.5 text-sm text-muted">
            {state === "on"
              ? `On for this device${devices > 1 ? ` (+${devices - 1} other)` : ""}.`
              : "Get habit reminders and your morning todo digest."}{" "}
            {reminderCount > 0
              ? `${reminderCount} habit${reminderCount === 1 ? " has a reminder" : "s have reminders"}.`
              : "Set reminder times when editing a habit."}
          </p>
          {PUSH_HINT[state] && <p className="mt-2 text-xs text-attention">{PUSH_HINT[state]}</p>}
        </div>
        <div className="flex gap-2">
          {state === "on" ? (
            <>
              <Button size="sm" onClick={test} disabled={pending}>
                <Send size={14} /> Test
              </Button>
              <Button size="sm" variant="danger" onClick={disable} disabled={pending}>
                <BellOff size={14} /> Turn off
              </Button>
            </>
          ) : (
            state === "off" && (
              <Button size="sm" variant="primary" onClick={enable} disabled={pending}>
                <BellRing size={14} /> Enable
              </Button>
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Morning todo digest</p>
          <p className="text-sm text-muted">One push listing todos due today and overdue ones.</p>
        </div>
        <Input
          type="time"
          className="w-32"
          value={digestForm.time}
          onChange={(e) => setDigestForm({ ...digestForm, time: e.target.value || "08:00" })}
          aria-label="Digest time"
        />
        <Switch
          checked={digestForm.enabled}
          onChange={(enabled) => setDigestForm({ ...digestForm, enabled })}
          label="Morning todo digest"
        />
        {digestDirty && (
          <Button
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (await run(updateTodoDigest(digestForm))) toast.success("Digest saved");
              })
            }
          >
            Save
          </Button>
        )}
      </div>
    </Box>
  );
}

const noop = () => () => {};

export function PublicProfileSettings({
  enabled,
  showHabits,
  slug,
}: {
  enabled: boolean;
  showHabits: boolean;
  slug: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const origin = useSyncExternalStore(noop, () => location.origin, () => "");
  const link = slug ? `${origin}/u/${slug}` : "";
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);

  const update = (next: { enabled: boolean; showHabits: boolean }) =>
    startTransition(async () => void (await run(setPublicProfile(next))));

  return (
    <Box className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Public profile</p>
          <p className="mt-0.5 text-sm text-muted">
            A read-only page with your contribution graph, level and badges — like a GitHub profile. Your email is
            never shown.
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={pending}
          onChange={(next) => update({ enabled: next, showHabits })}
          label="Public profile"
        />
      </div>

      {enabled && slug && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Public link" className="font-mono text-xs sm:text-xs" />
            <Button
              className="h-9"
              onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copied"))}
              aria-label="Copy link"
            >
              <Copy size={14} />
            </Button>
            {canShare ? (
              <Button className="h-9" onClick={() => navigator.share({ title: "My Atom Hub", url: link }).catch(() => {})} aria-label="Share">
                <Share size={14} />
              </Button>
            ) : (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-md border border-line bg-subtle px-3 text-fg hover:bg-line-muted"
                aria-label="Open public profile"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Show my habits (names, icons and their graphs)</span>
            <Switch
              checked={showHabits}
              disabled={pending}
              onChange={(next) => update({ enabled, showHabits: next })}
              label="Show habits publicly"
            />
          </label>
          <Button
            size="sm"
            variant="invisible"
            disabled={pending}
            onClick={() => {
              if (confirm("Create a new link? The old one will stop working.")) {
                startTransition(async () => void (await run(regeneratePublicLink())));
              }
            }}
          >
            <RotateCcw size={14} /> Reset link
          </Button>
        </div>
      )}
    </Box>
  );
}

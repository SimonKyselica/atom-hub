"use client";

import { LogOut } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { logout } from "@/actions/auth";
import { updateProfile } from "@/actions/user";
import { run } from "@/lib/feedback";
import { clearCachedPages } from "@/lib/pwa";
import { Button, Field, Input, Segmented } from "./ui";

export function SettingsForm({ name, weekStart, timezone }: { name: string; weekStart: number; timezone: string }) {
  const [form, setForm] = useState({ name, weekStart });
  const [pending, startTransition] = useTransition();
  const dirty = form.name !== name || form.weekStart !== weekStart;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          if (await run(updateProfile(form))) toast.success("Settings saved");
        });
      }}
    >
      <Field label="Name">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} required />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Week starts on</span>
        <Segmented
          value={form.weekStart}
          onChange={(weekStart) => setForm({ ...form, weekStart })}
          options={[
            { value: 0, label: "Sunday" },
            { value: 1, label: "Monday" },
          ]}
        />
      </div>
      <p className="text-xs text-muted">
        Timezone: <b>{timezone}</b> (follows your device automatically)
      </p>
      <Button type="submit" variant="primary" disabled={!dirty || pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await clearCachedPages();
          await logout();
        })
      }
    >
      <LogOut size={14} /> Sign out
    </Button>
  );
}

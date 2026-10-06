"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createReward, deleteReward, redeemReward, updateReward } from "@/actions/rewards";
import { formatRelativeDue, type DateKey } from "@/lib/dates";
import { celebrate, run } from "@/lib/feedback";
import { DIFFICULTIES, PERFECT_DAY_BONUS } from "@/lib/game";
import type { ActivityDTO, GameResult, RewardDTO, RewardInput } from "@/lib/types";
import { CoinAmount } from "./level-badge";
import { Box, Button, Dialog, EmojiPicker, Field, Input, ProgressBar } from "./ui";

const REWARD_EMOJIS = ["🎁", "☕", "🍫", "🍕", "🍦", "📺", "🎮", "🍿", "🛍️", "📖", "🎧", "🛀", "😴", "✈️", "🎟️", "💆"];

function RewardCard({ reward, coins, onEdit }: { reward: RewardDTO; coins: number; onEdit: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const affordable = coins >= reward.cost;

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  function redeem() {
    if (!confirming) return setConfirming(true);
    setConfirming(false);
    startTransition(async () => {
      const res = await run<GameResult>(redeemReward(reward.id));
      if (!res) return;
      toast.success(`Enjoy: ${reward.name}!`, { icon: reward.emoji, description: `−${reward.cost} coins. You earned it.` });
      celebrate(res, { quiet: true });
    });
  }

  function remove() {
    if (!confirm(`Remove “${reward.name}” from the shop?`)) return;
    startTransition(async () => void (await run(deleteReward(reward.id))));
  }

  return (
    <Box className="flex flex-col p-4">
      <div className="flex items-start justify-between">
        <span className="text-4xl leading-none">{reward.emoji}</span>
        <div className="-mt-1 -mr-1 flex">
          <Button variant="invisible" size="sm" className="h-8 w-8 px-0" onClick={onEdit} aria-label="Edit reward">
            <Pencil size={14} />
          </Button>
          <Button variant="invisible" size="sm" className="h-8 w-8 px-0 hover:!text-danger" onClick={remove} aria-label="Delete reward">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      <p className="mt-3 font-semibold break-words">{reward.name}</p>
      <p className="text-xs text-muted">
        {reward.redeemedCount ? `Redeemed ${reward.redeemedCount}×` : "Never redeemed"}
      </p>
      <div className="mt-auto pt-3">
        {!affordable && (
          <div className="mb-2">
            <ProgressBar percent={(Math.max(coins, 0) / reward.cost) * 100} className="h-1.5" barClassName="bg-coin" />
            <p className="mt-1 text-xs text-muted">{(reward.cost - coins).toLocaleString("en-US")} more coins to go</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <CoinAmount coins={reward.cost} />
          <Button variant={confirming ? "danger" : "primary"} disabled={!affordable || pending} onClick={redeem}>
            {pending ? "…" : confirming ? "Tap to confirm" : "Redeem"}
          </Button>
        </div>
      </div>
    </Box>
  );
}

function RewardForm({ reward, onDone }: { reward?: RewardDTO; onDone: () => void }) {
  const [form, setForm] = useState<RewardInput>(
    reward ? { name: reward.name, emoji: reward.emoji, cost: reward.cost } : { name: "", emoji: "🎁", cost: 50 },
  );
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await run(reward ? updateReward(reward.id, form) : createReward(form));
          if (res) onDone();
        });
      }}
    >
      <Field label="Reward">
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Order takeout"
          required
          maxLength={80}
          autoFocus
        />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Icon</span>
        <EmojiPicker value={form.emoji} onChange={(emoji) => setForm({ ...form, emoji })} extra={REWARD_EMOJIS} />
      </div>
      <Field label="Cost in coins" hint={`A medium habit earns ${DIFFICULTIES.medium.coins} coins per day.`}>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
          required
        />
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending || !form.name.trim() || form.cost < 1}>
          {pending ? "Saving…" : reward ? "Save" : "Add reward"}
        </Button>
      </div>
    </form>
  );
}

export function Shop({
  rewards,
  history,
  coins,
  today,
}: {
  rewards: RewardDTO[];
  history: ActivityDTO[];
  coins: number;
  today: DateKey;
}) {
  const [editing, setEditing] = useState<RewardDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const close = () => (setCreating(false), setEditing(null));

  return (
    <div className="space-y-6">
      <Box className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-attention-muted text-3xl">🪙</div>
        <div className="flex-1">
          <p className="text-sm text-muted">Your balance</p>
          <CoinAmount coins={coins} className="text-3xl" />
        </div>
        <p className="w-full text-xs text-muted sm:w-auto sm:max-w-xs sm:text-right">
          Earn coins from habits ({DIFFICULTIES.easy.coins}–{DIFFICULTIES.hard.coins}, more on streaks), todos, perfect days (+
          {PERFECT_DAY_BONUS.coins}) and achievements.
        </p>
      </Box>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Rewards</h2>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> New reward
          </Button>
        </div>
        {rewards.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((r) => (
              <RewardCard key={r.id} reward={r} coins={coins} onEdit={() => setEditing(r)} />
            ))}
          </div>
        ) : (
          <Box className="px-6 py-10 text-center text-sm text-muted">
            Add rewards you&apos;d love to earn — a coffee, a movie night, a new gadget.
          </Box>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Recently redeemed</h2>
          <Box>
            <ul className="divide-y divide-line">
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="text-lg">{h.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{h.label}</span>
                  <span className="text-xs text-muted">{formatRelativeDue(h.date, today)}</span>
                  <CoinAmount coins={h.coins} className="text-xs" />
                </li>
              ))}
            </ul>
          </Box>
        </section>
      )}

      <Dialog open={creating || !!editing} onClose={close} title={editing ? "Edit reward" : "New reward"}>
        {(creating || editing) && <RewardForm key={editing?.id ?? "new"} reward={editing ?? undefined} onDone={close} />}
      </Dialog>
    </div>
  );
}

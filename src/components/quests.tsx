"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { claimQuest } from "@/actions/quests";
import { cn } from "@/lib/cn";
import { celebrate, run } from "@/lib/feedback";
import type { GameResult, QuestDTO } from "@/lib/types";
import { Box, Button, ProgressBar } from "./ui";

function QuestRow({ quest }: { quest: QuestDTO }) {
  const [pending, startTransition] = useTransition();
  const complete = quest.progress >= quest.goal;

  function claim() {
    startTransition(async () => {
      const res = await run<GameResult>(claimQuest(quest.key));
      if (!res) return;
      toast.success(`Quest complete: ${quest.title}`, { icon: quest.icon, description: `+${quest.reward} coins` });
      celebrate(res, { quiet: true });
    });
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className={cn("text-xl", quest.claimed && "opacity-50")} aria-hidden>
        {quest.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", quest.claimed && "text-muted line-through decoration-muted/60")}>
          {quest.title}
        </p>
        {!quest.claimed && (
          <div className="mt-1 flex items-center gap-2">
            <ProgressBar percent={(quest.progress / quest.goal) * 100} className="h-1.5 flex-1" barClassName="!bg-attention" />
            <span className="text-xs text-muted tabular-nums">
              {quest.progress}/{quest.goal}
            </span>
          </div>
        )}
      </div>
      {quest.claimed ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-success">
          <Check size={14} /> Claimed
        </span>
      ) : complete ? (
        <Button size="sm" variant="primary" disabled={pending} onClick={claim} className="pop">
          Claim 🪙{quest.reward}
        </Button>
      ) : (
        <span className="text-xs font-semibold text-coin tabular-nums">🪙{quest.reward}</span>
      )}
    </li>
  );
}

export function DailyQuests({ quests }: { quests: QuestDTO[] }) {
  if (!quests.length) return null;
  const done = quests.filter((q) => q.claimed).length;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Daily quests</h2>
        <span className="text-xs text-muted">
          {done}/{quests.length} claimed · new ones at midnight
        </span>
      </div>
      <Box>
        <ul className="divide-y divide-line">
          {quests.map((q) => (
            <QuestRow key={q.key} quest={q} />
          ))}
        </ul>
      </Box>
    </section>
  );
}

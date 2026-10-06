"use client";

import confetti from "canvas-confetti";
import { toast } from "sonner";
import { PERFECT_DAY_BONUS, levelTitle } from "./game";
import type { ActionError, GameResult } from "./types";

const GREENS = ["#0e4429", "#006d32", "#26a641", "#39d353", "#9be9a8"];

function burst(big = false) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({
    particleCount: big ? 160 : 70,
    spread: big ? 100 : 70,
    startVelocity: big ? 45 : 32,
    origin: { y: 0.7 },
    colors: GREENS,
    shapes: ["square"],
    scalar: 0.9,
  });
}

export function formatDelta(xp: number, coins: number) {
  const parts: string[] = [];
  if (xp) parts.push(`${xp > 0 ? "+" : "−"}${Math.abs(xp)} XP`);
  if (coins) parts.push(`${coins > 0 ? "+" : "−"}${Math.abs(coins)} coins`);
  return parts.join(" · ");
}

/** Toasts and confetti for the big moments. `quiet` skips the plain "+XP" toast. */
export function celebrate(result: GameResult, { quiet = false } = {}) {
  let celebrated = false;

  if (result.levelAfter > result.levelBefore) {
    toast.success(`Level up! You reached level ${result.levelAfter}`, {
      description: `New title: ${levelTitle(result.levelAfter)}`,
      icon: "⬆️",
    });
    burst(true);
    celebrated = true;
  }

  for (const a of result.achievements) {
    toast(`Achievement unlocked: ${a.name}`, {
      description: a.coins ? `${a.description} · +${a.coins} coins` : a.description,
      icon: a.icon,
    });
    if (!celebrated) burst();
    celebrated = true;
  }

  if (result.mastery) {
    const { habit, emoji, tier } = result.mastery;
    toast.success(`${emoji} ${habit} reached ${tier.name} mastery!`, {
      description: `+${tier.coins} coins · keep going for the next tier`,
      icon: tier.icon,
    });
    if (!celebrated) burst(true);
    celebrated = true;
  }

  if (result.freezeRefunded) {
    toast("Streak freeze refunded", { description: "That day is complete now, so your freeze is back.", icon: "❄️" });
  }

  if (result.perfectDay === "gained") {
    toast.success("Perfect day!", {
      description: `Every habit done · ${formatDelta(PERFECT_DAY_BONUS.xp, PERFECT_DAY_BONUS.coins)} bonus`,
      icon: "🌟",
    });
    if (!celebrated) burst();
  } else if (result.perfectDay === "lost") {
    toast("Perfect day bonus removed", { icon: "↩️" });
  }

  if (!quiet && (result.xp || result.coins)) {
    toast(formatDelta(result.xp, result.coins), { icon: result.xp >= 0 ? "✨" : "↩️", duration: 2000 });
  }
}

/** Await a Server Action, toasting errors. Returns null when it failed. */
export async function run<T extends { ok: true }>(promise: Promise<T | ActionError>): Promise<T | null> {
  try {
    const result = await promise;
    if (!result.ok) {
      toast.error(result.error);
      return null;
    }
    return result;
  } catch (err) {
    console.error(err);
    toast.error(navigator.onLine ? "Something went wrong. Please try again." : "You're offline — reconnect to save changes.");
    return null;
  }
}

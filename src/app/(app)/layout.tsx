import Link from "next/link";
import { CoinAmount, LevelChip } from "@/components/level-badge";
import { Identicon } from "@/components/identicon";
import { BottomNav, TopNav } from "@/components/nav";
import { ClientSync } from "@/components/pwa";
import { requireUser } from "@/lib/dal";
import { Todo } from "@/lib/models";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const openTodos = await Todo.countDocuments({ userId: user._id, done: false });

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-inset/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
            <span className="font-semibold">Atom Hub</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/profile" aria-label="Level and XP">
              <LevelChip xp={user.xp} />
            </Link>
            <Link href="/shop" aria-label="Coins">
              <CoinAmount coins={user.coins} />
            </Link>
            <Link href="/profile" className="hidden sm:block" aria-label="Profile">
              <Identicon seed={String(user._id)} size={32} className="ring-1 ring-line" />
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-2">
          <TopNav counts={{ "/todos": openTodos }} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 md:py-8">{children}</main>
      <BottomNav />
      <ClientSync timezone={user.timezone} />
    </div>
  );
}

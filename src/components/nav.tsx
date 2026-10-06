"use client";

import { CalendarCheck, CircleUser, Grid3x3, ListTodo, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "Today", icon: CalendarCheck },
  { href: "/habits", label: "Habits", icon: Grid3x3 },
  { href: "/todos", label: "Todos", icon: ListTodo },
  { href: "/shop", label: "Shop", icon: Store },
  { href: "/profile", label: "Profile", icon: CircleUser },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** GitHub's underline tab nav, shown on tablet/desktop. */
export function TopNav({ counts }: { counts: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar -mb-px hidden overflow-x-auto md:flex" aria-label="Main">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex items-center gap-2 px-3 py-3 text-sm whitespace-nowrap text-fg",
              "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full",
              active ? "font-semibold after:bg-[#fd8c73]" : "after:bg-transparent",
            )}
          >
            <span className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-subtle">
              <Icon size={16} className="text-muted" />
              {label}
              {counts[href] ? (
                <span className="rounded-full bg-line-muted px-1.5 text-xs leading-5 font-medium">{counts[href]}</span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom tab bar on phones — thumb-friendly in the installed PWA. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-inset/95 backdrop-blur md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium transition-colors",
                active ? "text-fg" : "text-muted",
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} className={active ? "text-success" : ""} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

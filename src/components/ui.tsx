"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "default" | "primary" | "danger" | "invisible";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  default: "bg-subtle text-fg border-line hover:bg-line-muted",
  primary: "bg-success-btn text-white border-black/10 hover:bg-success-btn-hover",
  danger: "bg-subtle text-danger border-line hover:bg-danger hover:text-white hover:border-danger",
  invisible: "bg-transparent text-muted border-transparent hover:bg-subtle hover:text-fg",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs gap-1",
  md: "h-8 px-3 text-sm gap-1.5",
  lg: "h-10 px-4 text-sm gap-2",
};

export function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border font-medium transition-colors select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-line bg-canvas px-3 text-base text-fg placeholder:text-muted sm:text-sm",
        "focus:border-accent focus:outline-2 focus:outline-offset-[-1px] focus:outline-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-fg">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Box({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-md border border-line bg-canvas", className)}>{children}</div>;
}

export function Chip({ className, children, title }: { className?: string; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line px-2 py-px text-xs font-medium whitespace-nowrap text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Counter({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-line-muted px-1.5 text-xs leading-5 font-medium text-fg">
      {children}
    </span>
  );
}

export function ProgressBar({ percent, className, barClassName }: { percent: number; className?: string; barClassName?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-line-muted", className)}>
      <div
        className={cn("h-full rounded-full bg-success transition-[width] duration-500", barClassName)}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-md border border-line bg-subtle p-0.5", className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-[5px] px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors",
            value === o.value ? "bg-canvas text-fg shadow-sm ring-1 ring-line" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Native <dialog>: a centered modal on desktop, a bottom sheet on phones. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-xl border border-line bg-overlay p-0 text-fg shadow-2xl",
        "backdrop:bg-black/60 sm:m-auto sm:max-w-lg sm:rounded-xl",
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-base font-semibold">{title}</h2>
            <Button variant="invisible" size="sm" onClick={onClose} aria-label="Close" className="-mr-1 h-8 w-8 px-0">
              <X size={16} />
            </Button>
          </div>
          <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
        </div>
      )}
    </dialog>
  );
}

const EMOJIS = [
  "✅", "💧", "📚", "🏃", "🧘", "💪", "🥗", "😴", "✍️", "🎸", "🧠", "💊",
  "🚭", "🌱", "🧹", "💻", "🗣️", "🙏", "🚶", "🚴", "🏊", "🍎", "☀️", "📵",
];

export function EmojiPicker({ value, onChange, extra = [] }: { value: string; onChange: (e: string) => void; extra?: string[] }) {
  const list = [...new Set([...extra, ...EMOJIS])];
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border text-lg transition-colors",
            value === e ? "border-accent bg-accent-muted" : "border-line bg-subtle hover:border-muted",
          )}
          aria-label={`Use ${e}`}
        >
          {e}
        </button>
      ))}
      <input
        value={list.includes(value) ? "" : value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="Other"
        aria-label="Custom emoji"
        className={cn(
          "h-9 w-16 rounded-md border bg-canvas px-2 text-center text-base",
          !list.includes(value) && value ? "border-accent" : "border-line",
        )}
      />
    </div>
  );
}

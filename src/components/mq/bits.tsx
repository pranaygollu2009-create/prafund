import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InfoTip({ label, text }: { label: string; text: string }) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        aria-label={`What is ${label}?`}
        className="text-info focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-0 z-30 mt-2 w-60 rounded-lg border border-border bg-popover p-3 text-xs leading-relaxed text-popover-foreground opacity-0 shadow-lift transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function StatCard({
  title,
  value,
  delta,
  tone = "neutral",
  hint,
}: {
  title: ReactNode;
  value: string;
  delta?: string;
  tone?: "neutral" | "gain" | "info" | "alert" | "reward";
  hint?: string;
}) {
  const toneClass = {
    neutral: "text-foreground",
    gain: "text-gain",
    info: "text-info",
    alert: "text-alert",
    reward: "text-reward",
  }[tone];
  return (
    <div className="mq-card p-5">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className={cn("mq-num mt-2 text-3xl font-bold", toneClass)}>{value}</p>
      {delta && <p className="mt-1 text-sm font-medium text-muted-foreground">{delta}</p>}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SimBadge({ children = "Simulated value" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-info-soft px-2.5 py-1 text-xs font-medium text-info">
      {children}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className="text-sm font-semibold tracking-wide text-info uppercase">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-base text-muted-foreground">{sub}</p>}
    </div>
  );
}

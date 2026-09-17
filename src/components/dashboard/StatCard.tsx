import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = false,
  tone = "violet",
}: {
  label: string;
  value: number | string | null;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
  tone?: "violet" | "blue" | "green" | "amber";
}) {
  const toneRing = {
    violet: "text-violet-700 bg-violet-50",
    blue: "text-lab-600 bg-lab-50",
    green: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
  }[tone];
  return (
    <div className={cn("panel flex flex-col justify-between p-4", accent && "border-violet-700 bg-violet-700 text-white")}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", accent ? "text-violet-100" : "text-ink-muted")}>{label}</p>
        {icon && <span className={cn("rounded-md p-1.5", accent ? "bg-white/15 text-white" : toneRing)}>{icon}</span>}
      </div>
      <p className={cn("tabular mt-3 text-3xl font-semibold tracking-tight", accent ? "text-white" : "text-ink")}>
        {value === null || value === undefined ? "—" : value}
      </p>
      {sub && <p className={cn("mt-1 text-xs", accent ? "text-violet-200" : "text-ink-muted")}>{sub}</p>}
    </div>
  );
}

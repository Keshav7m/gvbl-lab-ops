import { REPORT_STATUS_LABELS, type ReportStatusKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ReportStatusKey, { pill: string; dot: string }> = {
  DRAFT: { pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  COMPLETED: { pill: "bg-lab-50 text-lab-700 ring-lab-100", dot: "bg-lab-500" },
  VERIFIED: { pill: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
};

export function StatusBadge({ status, className }: { status: ReportStatusKey; className?: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", style.pill, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {REPORT_STATUS_LABELS[status]}
    </span>
  );
}

const TONES = {
  neutral: "bg-mist text-ink-muted ring-1 ring-inset ring-rule",
  violet: "bg-violet-100 text-violet-800",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-800",
  green: "bg-emerald-50 text-emerald-800",
} as const;

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: keyof typeof TONES; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", TONES[tone], className)}>
      {children}
    </span>
  );
}
